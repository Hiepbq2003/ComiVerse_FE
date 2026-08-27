# -*- coding: utf-8 -*-
"""AI accuracy probe — gửi câu factual (domain) + câu out-of-scope (anti-hallucination),
capture phản hồi bot thật (message bubble, không phải footer). Phát hiện greeting canned
(nhiều câu trả về cùng text → scripted, không generative).

Chạy cho sản phẩm CÓ chatbot (has_chatbot=True) và đã AI_REACHED ở qa_harness.

Usage:
    python3 ai_probe.py <team-id>                         # chạy với câu hỏi mẫu
    python3 ai_probe.py <team-id> --custom '["q1","q2"]'  # chạy với câu hỏi của bạn
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_teams import TEAMS, SHOT, team_dir
from playwright.sync_api import sync_playwright

# Câu hỏi mẫu — 1 câu domain (factual) + 1 câu out-of-scope (kiểm anti-bịa).
# out-of-scope: bot TỐT sẽ thừa nhận không biết thay vì bịa.
QUESTIONS = [
    "Sự khác nhau giữa AI, machine learning và deep learning là gì?",
    "Bạn có biết kết quả trận bóng đá hôm qua không?",  # out-of-scope
]

def login(pg, url, user, pwd, sub):
    pg.goto(url, wait_until="networkidle", timeout=50000); pg.wait_for_timeout(2500)
    for sel in ["text=Đăng nhập", "text=Login", "text=Sign in", "button:has-text('Đăng nhập')"]:
        try:
            e = pg.query_selector(sel)
            if e and e.is_visible(): e.click(); pg.wait_for_timeout(1500); break
        except: pass
    ins = [e for e in pg.query_selector_all("input") if e.is_visible()]
    pw = [e for e in ins if (e.get_attribute("type") or "") == "password"]
    us = [e for e in ins if (e.get_attribute("type") or "text") not in ("password", "submit", "button", "checkbox", "radio", "hidden")]
    if not (us and pw): return False
    us[0].fill(user); pw[0].fill(pwd); pg.wait_for_timeout(300)
    s = None
    for sel in ["button[type=submit]", "input[type=submit]"] + [f"button:has-text('{x}')" for x in sub]:
        e = pg.query_selector(sel)
        if e and e.is_visible(): s = e; break
    (s.click() if s else pw[0].press("Enter")); pg.wait_for_timeout(5500); return True

def find_chat_input(pg):
    """Kỹ thuật 3 — tìm input chat THẬT, loại search box."""
    for sel in ["textarea", "div[contenteditable=true]"]:
        for el in pg.query_selector_all(sel):
            try:
                if el.is_visible(): return el
            except: pass
    for el in pg.query_selector_all("input[type=text], input:not([type])"):
        try:
            if not el.is_visible(): continue
            ph = (el.get_attribute("placeholder") or "").lower()
            if any(s in ph for s in ["tìm", "search"]): continue        # bỏ search box
            if any(s in ph for s in ["câu hỏi", "hỏi", "nhắn", "chat", "message", "assistant", "trợ lý", "ask", "question"]):
                return el
        except: pass
    return None

def chat(pg, q):
    """Kỹ thuật 4 — capture bot BUBBLE, không phải body[-N:]."""
    inp = find_chat_input(pg)
    if not inp: return None, "no_input"
    inp.fill(q); pg.wait_for_timeout(400)
    sent = False
    for s2 in ["button[type=submit]", "button:has-text('Gửi')", "button:has-text('Send')", "text=Gửi", "text=Send"]:
        try:
            b = pg.query_selector(s2)
            if b and b.is_visible(): b.click(); sent = True; break
        except: pass
    if not sent:
        try: inp.press("Enter"); sent = True
        except: pass
    pg.wait_for_timeout(10000)
    msgs = pg.query_selector_all("div,section,li,p,span")
    best = ""
    for m in msgs[-60:]:
        try:
            tx = (m.inner_text() or "").strip()
            # bubble hợp lệ: 25-1500 ký tự, KHÔNG chứa câu gốc, KHÔNG chứa "footer"
            if 25 < len(tx) < 1800 and q[:6] not in tx and "footer" not in tx.lower():
                if len(tx) > len(best) and len(tx) < 1500: best = tx
        except: pass
    return best, ("sent" if sent else "nosend")

def probe(team, questions, shotprefix="ai"):
    """Chạy hội thoại với trợ lý AI của 1 sản phẩm. Yêu cầu đã có account + route AI."""
    n = team["n"]; url = team["url"]; route = team.get("ai_route", "/assistant")
    creds = team.get("creds") or []
    if not creds or not url:
        print(f"T{n}: không có account/URL → bỏ qua (chạy qa_harness để phát hiện demo mode trước)")
        return None
    c = creds[0]
    sub = team.get("login_texts", ["Đăng nhập", "Login", "Sign in"])
    TD = team_dir(n)
    out = {"team": n, "questions": []}
    with sync_playwright() as p:
        br = p.chromium.launch(headless=True)
        ctx = br.new_context(viewport={"width": 1366, "height": 940})
        pg = ctx.new_page()
        login(pg, url, c["u"], c["p"], sub)
        if route:
            pg.goto(url.rstrip("/") + route, wait_until="networkidle", timeout=40000)
            pg.wait_for_timeout(3500)
        for i, q in enumerate(questions):
            ans, err = chat(pg, q)
            out["questions"].append({"q": q, "a": (ans or "")[:700], "err": err})
            try: pg.screenshot(path=os.path.join(TD, f"TC-B-{i+3}_{shotprefix}_q{i+1}.png"))
            except: pass
        br.close()
    json.dump(out, open(os.path.join(TD, "aifacts.json"), "w"), ensure_ascii=False, indent=1)
    # Phát hiện greeting canned: nếu các câu trả lời giống nhau → scripted
    answers = [qa["a"] for qa in out["questions"] if qa["a"]]
    canned = len(set(answers)) == 1 and len(answers) >= 2
    print(f"=== T{n} ({team['name']}) ===  canned={canned}")
    for qa in out["questions"]:
        print("Q:", qa["q"][:50])
        print("A:", repr((qa["a"] or qa["err"])[:300]))
    if canned:
        print("⚠ CẢNH BÁO: các câu trả lời GIỐNG NHAU → có thể greeting canned (không generative)")
    return out

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 ai_probe.py <team-id> [--custom 'JSON questions']")
        sys.exit(1)
    team_id = sys.argv[1]
    team = next((x for x in TEAMS if x["n"] == team_id), None)
    if not team:
        print(f"Không tìm thấy team '{team_id}' trong qa_teams.py"); sys.exit(1)
    questions = json.loads(sys.argv[sys.argv.index("--custom") + 1]) if "--custom" in sys.argv else QUESTIONS
    probe(team, questions)
