# -*- coding: utf-8 -*-
"""Sinh ảnh placeholder NEUTRAL cho report mẫu (không chứa dữ liệu thật/PII).
Chỉ dùng cho samples/QA-Report-Sample — thay bằng screenshot thật khi test sản phẩm của bạn.
"""
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "samples")
os.makedirs(OUT, exist_ok=True)

NAVY = (31, 56, 100); TEAL = (15, 107, 123); LIGHT = (238, 242, 247)
GRAY = (90, 99, 110); GREEN = (30, 122, 50); WHITE = (255, 255, 255)

SHOTS = [
    ("TC-A-01_home.png", "Trang chủ — load 200", "demo.example.com", GREEN),
    ("TC-A-02_role_admin.png", "Login ADMIN — token + role-nav", "admin → /users /audit-logs", GREEN),
    ("TC-A-02_role_editor.png", "Login EDITOR — role-nav diff", "editor → /versions", GREEN),
    ("TC-E-01_dashboard.png", "Feature inventory — dashboard", "12 feature phát hiện", TEAL),
    ("TC-E-04_repository.png", "Kho tài liệu (CRUD)", "/repository — admin", TEAL),
    ("TC-E-08_permissions.png", "Phân quyền RBAC", "/permissions — responsive OK", TEAL),
    ("TC-B-02_ai_response.png", "Trợ lý RAG — phản hồi grounded", "/assistant — trích dẫn KB", NAVY),
    ("TC-B-3_ai_q1.png", "AI Q1 — câu domain (grounded)", "trích dẫn tài liệu KB", NAVY),
]


def font(size):
    for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf",
              "/System/Library/Fonts/Helvetica.ttc",
              "/Library/Fonts/Arial.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()


def render(fname, title, sub, accent):
    W, H = 1000, 620
    img = Image.new("RGB", (W, H), LIGHT); d = ImageDraw.Draw(img)
    # top bar
    d.rectangle([0, 0, W, 70], fill=accent)
    d.text((24, 22), "DemoKB — sample screenshot", font=font(22), fill=WHITE)
    # window dots
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([W - 90 + i * 22, 26, W - 90 + i * 22 + 14, 40], fill=c)
    # placeholder browser body
    d.rectangle([24, 100, W - 24, H - 24], fill=WHITE, outline=(210, 216, 226), width=2)
    d.text((48, 130), title, font=font(30), fill=NAVY)
    d.text((48, 180), sub, font=font(20), fill=GRAY)
    # mock UI lines
    y = 240
    for i in range(6):
        d.rectangle([48, y + i * 44, 48 + (760 - i * 70), y + i * 44 + 18], fill=(228, 233, 242))
    # badge
    d.rounded_rectangle([W - 260, 130, W - 60, 185], radius=10, fill=accent)
    d.text((W - 245, 142), "PROOF", font=font(22), fill=WHITE)
    d.text((48, H - 60), "Hình minh hoạ neutral — thay bằng screenshot thật khi test sản phẩm của bạn.",
           font=font(15), fill=GRAY)
    img.save(os.path.join(OUT, fname))
    print("wrote", fname)


if __name__ == "__main__":
    for s in SHOTS: render(*s)
    print("ALL SHOTS ->", OUT)
