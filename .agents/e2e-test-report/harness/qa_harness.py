# -*- coding: utf-8 -*-
"""QA harness v2 — applies Proof Layer.
Login verified by token store + role-nav diff. AI: find real chat route, capture bot bubble.
Screenshots per step. Verdict: PASS/FAIL/UNVERIFIED/PARTIAL.
Usage: python3 v2_harness.py NN
"""
import sys, os, json, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_teams import TEAMS, SHOT, team_dir
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print("Usage: python3 qa_harness.py <team-id>  (xem TEAMS trong qa_teams.py)"); sys.exit(1)
N=sys.argv[1]; t=next(x for x in TEAMS if x["n"]==N)
TD=team_dir(N)
E={"team":N,"name":t["name"],"url":t["url"],"topic":t["topic"],"lead":t["lead"],
   "ts":time.strftime("%Y-%m-%d %H:%M:%S"),
   "console":[],"net4xx":[],"screenshots":[],"claims":[],"verdicts":{}}

if not t["url"]:
    E["fatal"]="no_url"; E["verdicts"]["overall"]="UNVERIFIED_NO_LINK"
    json.dump(E,open(os.path.join(TD,"ev2.json"),"w"),ensure_ascii=False,indent=1)
    print("NO_URL",N); sys.exit(0)

def shot(pg,name):
    p=os.path.join(TD,name);
    try: pg.screenshot(path=p); E["screenshots"].append(name)
    except: pass

def token_state(ctx,pg):
    tok={"cookies":[c["name"] for c in ctx.cookies()]}
    try: tok["localStorage"]=list(pg.evaluate("()=>Object.keys(localStorage)"))
    except: tok["localStorage"]=[]
    try: tok["sessionStorage"]=list(pg.evaluate("()=>Object.keys(sessionStorage)"))
    except: tok["sessionStorage"]=[]
    tok["has_auth"]=any(("auth" in k.lower() or "token" in k.lower() or "session" in k.lower() or "user" in k.lower()) for k in (tok["cookies"]+tok["localStorage"]+tok["sessionStorage"]))
    return tok

def nav_set(pg):
    s=set()
    try:
        for a in pg.query_selector_all("a[href]"):
            h=a.get_attribute("href") or ""
            if h.startswith("/"): s.add(h)
    except: pass
    return s

def find_login_inputs(pg):
    ins=[e for e in pg.query_selector_all("input") if e.is_visible()]
    pw=[e for e in ins if (e.get_attribute("type") or "")=="password"]
    us=[e for e in ins if (e.get_attribute("type") or "text") not in ("password","submit","button","checkbox","radio","hidden")]
    return us,pw

def try_login(pg,ctx,user,pwd,sub_texts):
    us,pw=find_login_inputs(pg)
    if not(us and pw): return {"ok":False,"reason":"no_login_inputs"}
    us[0].fill(user); pw[0].fill(pwd);
    pg.wait_for_timeout(300)
    before_nav=nav_set(pg); before_tok=token_state(ctx,pg)
    sub=None
    for sel in ["button[type=submit]","input[type=submit]"]+[f"button:has-text('{s}')" for s in sub_texts]+[f"text={s}" for s in sub_texts]:
        e=pg.query_selector(sel)
        if e and e.is_visible(): sub=e; break
    (sub.click() if sub else pw[0].press("Enter"))
    pg.wait_for_timeout(5500)
    after_tok=token_state(ctx,pg); after_nav=nav_set(pg)
    nav_new=sorted(after_nav-before_nav)
    tok_new=([k for k in after_tok["cookies"] if k not in before_tok["cookies"]]+
             [k for k in after_tok["localStorage"] if k not in before_tok["localStorage"]])
    return {"ok":True,"after_url":pg.url,"after_title":pg.title(),
            "tok_before":before_tok,"tok_after":after_tok,
            "tok_new":tok_new[:12],"nav_new":nav_new[:20],
            "nav_after":sorted(after_nav)[:25],
            "has_new_token": len(tok_new)>0 or after_tok["has_auth"]}

# ===================== Kỹ thuật 9.5 — On-page credential discovery =====================
# Khi sheet không có account → quét 4 nguồn on-page TRƯỚC khi ghi UNVERIFIED_NO_CRED:
#   Nguồn 1: credentials hiển thị trong DOM (panel demo / hint text)
#   Nguồn 2: button Demo / Showcase / Guest mode (app tự login bằng account mẫu)
#   Nguồn 3: form login đã prefilled (input value non-empty)
#   Nguồn 4: route /demo, /showcase, ?demo=1 (vào luôn logged-in)
DEMO_BTN_TEXTS=["Demo","Showcase","Dùng thử","Khám phá","Try","Guest","Xem demo","Tài khoản mẫu",
                "Demo mode","Showcase mode","Try demo","Guest login","Quick start","Experience","Trải nghiệm","Vào thử"]
DEMO_ROUTES=["/demo","/showcase","/preview","/guest","/try","/demo-mode"]

def _open_login_form(pg):
    """Mở form login nếu có (để scan creds/prefilled bên trong form)."""
    for sel in ["text=Đăng nhập","text=Login","text=Sign in","button:has-text('Đăng nhập')","text=Đăng ký"]:
        try:
            el=pg.query_selector(sel)
            if el and el.is_visible(): el.click(); pg.wait_for_timeout(1500); break
        except: pass

def scan_text_creds(pg):
    """Nguồn 1: scan body text cho pattern email:password / role+email+pass."""
    try: text=pg.inner_text("body") or ""
    except: text=""
    out=[]
    for m in re.finditer(r"([\w.+-]+@[\w.-]+)\s*[:/|—\-]\s*([A-Za-z0-9_@!#$%]{4,})",text):
        out.append({"u":m.group(1),"p":m.group(2),"role":""})
    for m in re.finditer(r"(?i)(admin|teacher|student|staff|gv|hs|user|guest|manager|qtv)[^\n]{0,40}?([\w.+-]+@[\w.-]+)\s*[:/|—\-]\s*(\S{4,})",text):
        out.append({"u":m.group(2),"p":m.group(3),"role":m.group(1).lower()})
    # "user / pass" không có @ (vd: admin / admin123)
    for m in re.finditer(r"(?i)(?:user|tài khoản|username|login|account|pass)[^\n]{0,15}?([\w.\-]{3,})\s*[/|:]\s*([A-Za-z0-9_@!#$%]{4,})",text):
        u=m.group(1)
        if u.lower() not in ("the","and","or","to"): out.append({"u":u,"p":m.group(2),"role":""})
    seen=set();ded=[]
    for c in out:
        k=(c["u"],c["p"])
        if k not in seen: seen.add(k);ded.append(c)
    return ded[:6]

def prefilled_creds(pg):
    """Nguồn 3: form login đã prefilled (input value non-empty)."""
    us,pw=find_login_inputs(pg)
    uv=us[0].get_attribute("value") if us else None
    pv=pw[0].get_attribute("value") if pw else None
    if uv and pv and len(uv)>2 and len(pv)>2: return [{"u":uv,"p":pv,"role":""}]
    return []

def click_demo_button(pg,ctx,base_url,shot):
    """Nguồn 2: button Demo/Showcase/Guest → app tự login. Trả về result hoặc None."""
    for txt in DEMO_BTN_TEXTS:
        for sel in [f"button:has-text('{txt}')",f"a:has-text('{txt}')",f"text={txt}"]:
            try:
                el=pg.query_selector(sel)
                if not (el and el.is_visible()): continue
                before_tok=token_state(ctx,pg); before_nav=nav_set(pg)
                el.click()
                try: pg.wait_for_load_state("networkidle",timeout=20000)
                except: pass
                pg.wait_for_timeout(2500)
                # chọn role trong modal nếu có
                for rsel in ["text=Admin","text=Teacher","text=Student","text=GV","text=HS","text=Guest","text=Quản trị"]:
                    try:
                        rl=pg.query_selector(rsel)
                        if rl and rl.is_visible(): rl.click(); pg.wait_for_timeout(1500); break
                    except: pass
                after_tok=token_state(ctx,pg); after_nav=nav_set(pg)
                tok_new=([k for k in after_tok["cookies"] if k not in before_tok["cookies"]]+
                         [k for k in after_tok["localStorage"] if k not in before_tok["localStorage"]])
                nav_new=sorted(after_nav-before_nav)
                try: shot(pg,"TC-A-02b_demo_mode.png")
                except: pass
                return {"clicked":txt,"has_new_token":len(tok_new)>0 or after_tok["has_auth"],
                        "nav_new":nav_new[:20],"after_url":pg.url}
            except: pass
    return None

def try_demo_routes(pg,base_url):
    """Nguồn 4: route /demo, /showcase → vào luôn logged-in."""
    base=base_url.rstrip("/").split("?")[0]
    for r in DEMO_ROUTES:
        full=base+r
        try:
            resp=pg.goto(full,wait_until="networkidle",timeout=20000); pg.wait_for_timeout(2000)
            if resp and resp.status<400:
                nav=nav_set(pg)
                bl=len(pg.inner_text("body") or "")
                if bl>400 and any(k in str(nav).lower() for k in ["/dashboard","/admin","/profile","/users","/logout","/settings","/home"]):
                    return {"route":r,"after_url":pg.url,"nav_seen":sorted(nav)[:15]}
        except: pass
    return None

def discover_onpage_login(pg,ctx,base_url,shot):
    """Kỹ thuật 9.5 — quét 4 nguồn on-page. Trả về dict creds/demo_logged_in/source/tried."""
    rec={"tried":[],"creds":[],"demo_logged_in":False,"source":None}
    _open_login_form(pg)
    # Nguồn 1 + 3 → credentials để feed vào login loop
    tc=scan_text_creds(pg); rec["tried"].append(f"dom_text:{len(tc)}")
    pc=prefilled_creds(pg); rec["tried"].append(f"prefilled:{len(pc)}")
    seen=set();merged=[]
    for c in tc+pc:
        k=(c["u"],c["p"])
        if k not in seen: seen.add(k);merged.append(c)
    rec["creds"]=merged
    # Nguồn 2: demo button
    demo=click_demo_button(pg,ctx,base_url,shot)
    if demo:
        rec["tried"].append(f"demo_btn:{demo.get('clicked')}")
        if demo.get("has_new_token") or demo.get("nav_new"):
            rec["demo_logged_in"]=True; rec["source"]="demo_button"; rec["demo_result"]=demo
    # Nguồn 4: demo route (chỉ nếu chưa login)
    if not rec["demo_logged_in"]:
        dr=try_demo_routes(pg,base_url)
        if dr:
            rec["tried"].append(f"demo_route:{dr.get('route')}")
            rec["demo_logged_in"]=True; rec["source"]="demo_route"; rec["demo_result"]=dr
    if not rec["demo_logged_in"] and merged: rec["source"]="onpage_creds"
    return rec
# ======================================================================================

def main():
    with sync_playwright() as p:
        br=p.chromium.launch(headless=True,args=["--no-sandbox"])
        ctx=br.new_context(viewport={"width":1366,"height":940},ignore_https_errors=True,
             user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
        pg=ctx.new_page()
        pg.on("console",lambda m:(E["console"].append(("ERR" if m.type=="error" else m.type,m.text[:250])) if m.type=="error" else None))
        pg.on("pageerror",lambda e:E["console"].append(("PAGEERR",str(e)[:250])))
        pg.on("response",lambda r:(E["net4xx"].append((r.status,r.url[:130])) if r.status>=400 else None))

        # === STEP 1: Load (SPA: networkidle) ===
        try:
            r=pg.goto(t["url"],wait_until="networkidle",timeout=50000)
            E["http"]=r.status if r else None
            pg.wait_for_timeout(3500)
        except Exception as e:
            E["load_err"]=str(e)[:200]
            try: pg.goto(t["url"],wait_until="domcontentloaded",timeout=45000); pg.wait_for_timeout(3000)
            except Exception as e2: E["load_err2"]=str(e2)[:200]
        E["title"]=pg.title()
        try: E["body_len"]=len(pg.inner_text("body") or "")
        except: E["body_len"]=0
        shot(pg,f"TC-A-01_step1_home.png")
        E["load_verdict"]= "PASS" if E.get("body_len",0)>200 else "SUSPECT_EMPTY"

        # === STEP 2: Auth (FRESH context per role) — Kỹ thuật 9.5: on-page credential discovery ===
        sheet_creds=t["creds"]
        onpage=None; creds=sheet_creds; creds_source="sheet"; demo_logged_in=False
        if not sheet_creds:
            # Sheet trống → quét 4 nguồn on-page TRƯỚC khi ghi UNVERIFIED (Kỹ thuật 9.5)
            onpage=discover_onpage_login(pg,ctx,t["url"],shot)
            E["onpage_discovery"]=onpage
            if onpage.get("demo_logged_in"):
                dr=onpage["demo_result"]; demo_logged_in=True; creds_source=onpage["source"]
                E["verdicts"]["auth"]="PASS_DEMO_MODE"
                E["claims"].append({"id":"AUTH-0","verdict":"PASS","source":onpage["source"],
                    "claim":f"Không có account sheet — login OK qua {onpage['source']} (account mẫu on-page)",
                    "proof":[f"{onpage['source']}: has_new_token={dr.get('has_new_token',True)} nav_new={(dr.get('nav_new') or dr.get('nav_seen') or [])[:5]}"],
                    "screenshot":"TC-A-02b_demo_mode.png","note":"Account lấy từ on-page demo/showcase (Kỹ thuật 9.5)"})
            elif onpage.get("creds"):
                creds=onpage["creds"]; creds_source="onpage_creds"
            else:
                E["verdicts"]["auth"]="UNVERIFIED_NO_CRED"
                E["claims"].append({"id":"AUTH-0","verdict":"UNVERIFIED","claim":"Không có account (đã quét on-page)",
                    "proof":onpage["tried"],"note":"Đã scan DOM creds + Demo/Showcase button + prefilled + /demo route — không thấy (Kỹ thuật 9.5)"})
        if creds and not demo_logged_in:
            results=[]
            for c in creds:
                rctx=br.new_context(viewport={"width":1366,"height":940},ignore_https_errors=True,
                     user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
                rpg=rctx.new_page()
                rpg.on("pageerror",lambda e:E["console"].append(("PAGEERR",str(e)[:200])))
                try:
                    rpg.goto(t["url"],wait_until="networkidle",timeout=50000); rpg.wait_for_timeout(2500)
                    for sel in ["text=Đăng nhập","text=Login","text=Sign in","button:has-text('Đăng nhập')"]:
                        try:
                            el=rpg.query_selector(sel)
                            if el and el.is_visible(): el.click(); rpg.wait_for_timeout(1500); break
                        except: pass
                    res=try_login(rpg,rctx,c["u"],c["p"],["Đăng nhập","Login","Sign in","Vào","Tiếp"])
                    res["role"]=c.get("role",""); res["user"]=c["u"]
                    try:
                        rpg.screenshot(path=os.path.join(TD,f"TC-A-02_role_{c['u']}.png")); E["screenshots"].append(f"TC-A-02_role_{c['u']}.png")
                    except: pass
                    results.append(res)
                except Exception as e:
                    results.append({"user":c["u"],"role":c.get("role",""),"ok":False,"reason":"err:"+str(e)[:100]})
                rctx.close()
            E["auth_results"]=results
            E["creds_source"]=creds_source
            verified=[r for r in results if r.get("has_new_token") or r.get("nav_new")]
            n_roles=len(results); n_ok=len(verified)
            if n_ok==n_roles and n_ok>0: E["verdicts"]["auth"]="PASS"
            elif n_ok==0: E["verdicts"]["auth"]="FAIL"
            else: E["verdicts"]["auth"]="PARTIAL"
            E["claims"].append({"id":"AUTH-1","verdict":E["verdicts"]["auth"],
                "claim":f"Login {n_ok}/{n_roles} role thành công [{creds_source}] (verify bằng token store + role nav diff)",
                "proof":[f"role {r.get('user')}: new_token={r.get('has_new_token')} nav_new={(r.get('nav_new') or [])[:4]}" for r in results[:4]],
                "screenshot":f"TC-A-02_role_{results[0].get('user')}.png"})

        # === STEP 3: AI / chatbot — find real route (own logged-in context) ===
        if t["has_chatbot"]:
            ai={"probes":[]}
            aictx=br.new_context(viewport={"width":1366,"height":940},ignore_https_errors=True,
                 user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
            apg=aictx.new_page()
            apg.on("pageerror",lambda e:E["console"].append(("PAGEERR",str(e)[:200])))
            logged_in=False
            if creds and not demo_logged_in:
                c=creds[0]
                try:
                    apg.goto(t["url"],wait_until="networkidle",timeout=50000); apg.wait_for_timeout(2500)
                    for sel in ["text=Đăng nhập","text=Login","text=Sign in","button:has-text('Đăng nhập')"]:
                        try:
                            el=apg.query_selector(sel)
                            if el and el.is_visible(): el.click(); apg.wait_for_timeout(1500); break
                        except: pass
                    rr=try_login(apg,aictx,c["u"],c["p"],["Đăng nhập","Login","Sign in","Vào","Tiếp"])
                    logged_in=bool(rr.get("has_new_token") or rr.get("nav_new"))
                except Exception as e: ai["login_err"]=str(e)[:100]
            elif demo_logged_in and onpage:
                # redo demo/showcase login trong context AI riêng (Kỹ thuật 9.5)
                try:
                    apg.goto(t["url"],wait_until="networkidle",timeout=50000); apg.wait_for_timeout(2500)
                    dr2=click_demo_button(apg,aictx,t["url"],lambda pg,n:None)
                    logged_in=bool(dr2 and (dr2.get("has_new_token") or dr2.get("nav_new")))
                except Exception as e: ai["login_err"]="demo:"+str(e)[:80]
            nav=sorted(nav_set(apg))
            ai["routes_seen"]=nav
            ai_candidates=[r for r in nav if any(k in r.lower() for k in ["assistant","chat","tro-ly","troly","ai","ask","concierge","companion","buddy"])]
            for path in ai_candidates+["/assistant","/tro-ly","/chat","/ai","/concierge"]:
                if not path: continue
                try:
                    full=t["url"].rstrip("/")+path if path.startswith("/") else path
                    apg.goto(full,wait_until="networkidle",timeout=40000); apg.wait_for_timeout(3000)
                    inp=None
                    # 1) prefer textarea/contenteditable (classic chat)
                    for sel in ["textarea","div[contenteditable=true]"]:
                        for el in apg.query_selector_all(sel):
                            try:
                                if el.is_visible(): inp=el; break
                            except: pass
                        if inp: break
                    # 2) else: text input with chat-like placeholder (skip search boxes)
                    if not inp:
                        for el in apg.query_selector_all("input[type=text], input:not([type])"):
                            try:
                                if not el.is_visible(): continue
                                ph=(el.get_attribute("placeholder") or "").lower()
                                if any(s in ph for s in ["tìm","search"]): continue  # skip search
                                if any(s in ph for s in ["câu hỏi","hỏi","nhắn","chat","message","assistant","trợ lý","ask","question"]):
                                    inp=el; break
                            except: pass
                    if inp:
                        ai["route"]=path; ai["input_found"]=True
                        try: apg.screenshot(path=os.path.join(TD,f"TC-B-01_assistant.png")); E["screenshots"].append("TC-B-01_assistant.png")
                        except: pass
                        for q in ["Xin chào, bạn là ai và giúp gì được cho tôi?"]:
                            inp.fill(q); apg.wait_for_timeout(400)
                            sent=False
                            for s2 in ["button[type=submit]","button:has-text('Gửi')","button:has-text('Send')","text=Gửi","text=Send"]:
                                try:
                                    b=apg.query_selector(s2)
                                    if b and b.is_visible(): b.click(); sent=True; break
                                except: pass
                            if not sent:
                                try: inp.press("Enter"); sent=True
                                except: pass
                            apg.wait_for_timeout(9000)
                            try:
                                msgs=apg.query_selector_all("div,section,li,p,span")
                                bot_text=""
                                for m in msgs[-50:]:
                                    try:
                                        tx=(m.inner_text() or "").strip()
                                        if 20<len(tx)<1500 and q[:5] not in tx and "footer" not in tx.lower():
                                            if len(tx)>len(bot_text) and len(tx)<1200: bot_text=tx
                                    except: pass
                                ai["probes"].append({"q":q,"sent":sent,"bot_response":bot_text[:800],"body_tail":(apg.inner_text("body") or "")[-500:]})
                            except Exception as e:
                                ai["probes"].append({"q":q,"err":str(e)[:120]})
                            try: apg.screenshot(path=os.path.join(TD,"TC-B-02_ai_response.png")); E["screenshots"].append("TC-B-02_ai_response.png")
                            except: pass
                        break
                except Exception as e:
                    ai.setdefault("route_errs",[]).append(f"{path}: {str(e)[:80]}")
            E["ai"]=ai
            if ai.get("input_found") and ai.get("probes"):
                resp=[pr for pr in ai["probes"] if pr.get("bot_response")]
                E["verdicts"]["ai"]="AI_REACHED" if resp else "AI_NO_RESPONSE"
                E["claims"].append({"id":"AI-1","verdict":("REACHED" if resp else "LỖI_no_response"),
                    "claim":f"AI assistant ở route {ai.get('route')} — {'có phản hồi' if resp else 'không phản hồi sau 9s'}",
                    "proof":[pr.get("bot_response","")[:200] for pr in ai["probes"][:1]],
                    "screenshot":"TC-B-02_ai_response.png"})
            elif not logged_in:
                E["verdicts"]["ai"]="UNVERIFIED_GATED"
                E["claims"].append({"id":"AI-1","verdict":"UNVERIFIED","claim":"AI assistant gated sau login — không login được","proof":["auth unverifiable"],"note":"Không suy ra AI-washing"})
            else:
                E["verdicts"]["ai"]="UNVERIFIED_NO_ROUTE"
                E["claims"].append({"id":"AI-1","verdict":"UNVERIFIED","claim":"Không tìm thấy route/input chat AI thật (sau khi login)","proof":["nav: "+", ".join(nav[:12])],"note":"Có thể AI ở flow khác — cần manual verify"})
            aictx.close()

        shot(pg,"TC-A-99_final.png")
        E["console"]=E["console"][:10]; E["net4xx"]=E["net4xx"][:12]
        br.close()

main()
json.dump(E,open(os.path.join(TD,"ev2.json"),"w"),ensure_ascii=False,indent=1)
print(f"V2 T{N} {t['name']}: http={E.get('http')} load={E['load_verdict']} auth={E['verdicts'].get('auth')} ai={E['verdicts'].get('ai')} shots={len(E['screenshots'])}")
