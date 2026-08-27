# -*- coding: utf-8 -*-
"""v3 FEATURE EXPLORE — crawl nav routes per role, build Feature Inventory + screenshot each.
Reuses v2 login technique. Output: feature_inventory.json per team."""
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_teams import TEAMS, SHOT, team_dir
from playwright.sync_api import sync_playwright

def fresh_login(br,url,user,pwd,sub):
    ctx=br.new_context(viewport={"width":1366,"height":940},ignore_https_errors=True,
         user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36")
    pg=ctx.new_page()
    pg.goto(url,wait_until="networkidle",timeout=50000); pg.wait_for_timeout(2200)
    for sel in ["text=Đăng nhập","text=Login","text=Sign in","button:has-text('Đăng nhập')"]:
        try:
            e=pg.query_selector(sel)
            if e and e.is_visible(): e.click(); pg.wait_for_timeout(1500); break
        except: pass
    ins=[e for e in pg.query_selector_all("input") if e.is_visible()]
    pw=[e for e in ins if (e.get_attribute("type") or "")=="password"]
    us=[e for e in ins if (e.get_attribute("type") or "text") not in ("password","submit","button","checkbox","radio","hidden")]
    if not(us and pw): ctx.close(); return None,None
    us[0].fill(user); pw[0].fill(pwd); pg.wait_for_timeout(300)
    s=None
    for sel in ["button[type=submit]","input[type=submit]"]+[f"button:has-text('{x}')" for x in sub]:
        e=pg.query_selector(sel)
        if e and e.is_visible(): s=e;break
    (s.click() if s else pw[0].press("Enter"))
    pg.wait_for_timeout(5500)
    return pg,ctx

def crawl(pg,TD,role_label,routes):
    inv=[]
    for i,r in enumerate(routes[:8]):
        if not r or not r.startswith("/"): continue
        try:
            pg.goto(pg.url.split("/")[0]+"//"+pg.url.split("/")[2]+r,wait_until="networkidle",timeout=35000)
            pg.wait_for_timeout(2500)
            title=pg.title(); body=(pg.inner_text("body") or "")
            blen=len(body)
            # classify feature type
            low=(title+" "+body[:400]).lower()
            ftype="page"
            for k,v in [("crud",["user","quản lý","create","edit","delete","thêm","sửa","xóa","bài nộp","đề tài"]),
                        ("chat",["assistant","trợ lý","chat","hỏi đáp","câu hỏi"]),
                        ("dashboard",["tổng quan","dashboard","thống kê","chart","report","báo cáo"]),
                        ("form",["đăng ký","register","submit","nhập","form"]),
                        ("import",["upload","tải lên","import","đồng bộ","sync"])]:
                if any(w in low for w in v): ftype=k; break
            sn=f"TC-E-{i+1:02d}_{role_label}_{r.strip('/').replace('/','-') or 'root'}.png"
            pg.screenshot(path=os.path.join(TD,sn))
            inv.append({"id":f"F-{role_label}-{i+1}","feature":title[:50],"route":r,"role":role_label,
                        "type":ftype,"body_len":blen,"status":"rendered" if blen>150 else "empty",
                        "screenshot":sn})
        except Exception as e:
            inv.append({"id":f"F-{role_label}-{i+1}","route":r,"role":role_label,"status":"err","err":str(e)[:80]})
    return inv

def main(N):
    t=next(x for x in TEAMS if x["n"]==N); TD=team_dir(N)
    out={"team":N,"name":t["name"],"url":t["url"],"inventory":[],"roles_crawled":[]}
    if not t["url"]:
        out["fatal"]="no_url"; json.dump(out,open(os.path.join(TD,"inv.json"),"w"),ensure_ascii=False,indent=1)
        print("NO_URL",N); return
    with sync_playwright() as p:
        br=p.chromium.launch(headless=True,args=["--no-sandbox"])
        # discover routes: from public nav + per-role nav (v2 already has role navs)
        v2path=os.path.join(TD,"ev2.json")
        known_routes=set()
        if os.path.exists(v2path):
            v2=json.load(open(v2path))
            for r in (v2.get("auth_results") or []):
                for rr in (r.get("nav_after") or []): known_routes.add(rr)
            ai=v2.get("ai") or {}
            for rr in (ai.get("routes_seen") or []): known_routes.add(rr)
        # public crawl (no login)
        try:
            ctx=br.new_context(viewport={"width":1366,"height":940},ignore_https_errors=True)
            pg=ctx.new_page()
            pg.goto(t["url"],wait_until="networkidle",timeout=50000); pg.wait_for_timeout(2500)
            pub=[a.get_attribute("href") for a in pg.query_selector_all("a[href]")]
            pub=[h for h in pub if h and h.startswith("/") and not h.startswith("/#")]
            for h in pub: known_routes.add(h)
            pub_unique=[]
            seen=set()
            for h in sorted(known_routes):
                if h not in seen and h not in ("/",): seen.add(h); pub_unique.append(h)
            inv=crawl(pg,TD,"public",pub_unique)
            out["inventory"].extend(inv); out["roles_crawled"].append("public")
            ctx.close()
        except Exception as e: out["public_err"]=str(e)[:100]
        # per-role crawl (if creds)
        if t["creds"]:
            for c in t["creds"][:2]:  # max 2 roles for time
                rl=(c.get("role") or c["u"]).replace(" ","_")[:14]
                pg,ctx=fresh_login(br,t["url"],c["u"],c["p"],["Đăng nhập","Login","Sign in"])
                if pg is None: continue
                # gather this role's routes from nav
                rroutes=set()
                for a in pg.query_selector_all("a[href]"):
                    h=a.get_attribute("href")
                    if h and h.startswith("/") and not h.startswith("/#"): rroutes.add(h)
                # prioritize AI/feature routes not yet crawled
                done={x["route"] for x in out["inventory"]}
                prio=sorted([r for r in rroutes if r not in done])
                inv=crawl(pg,TD,rl,prio[:6])
                out["inventory"].extend(inv); out["roles_crawled"].append(rl)
                ctx.close()
        br.close()
    json.dump(out,open(os.path.join(TD,"inv.json"),"w"),ensure_ascii=False,indent=1)
    rendered=[x for x in out["inventory"] if x.get("status")=="rendered"]
    print(f"EXPLORE T{N} {t['name']}: {len(out['inventory'])} features, {len(rendered)} rendered, roles={out['roles_crawled']}")

for N in sys.argv[1:]: main(N)
