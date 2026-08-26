# -*- coding: utf-8 -*-
"""Cấu hình sản phẩm cần test — BẠN CHỈNH SỬA FILE NÀY.

Mỗi sản phẩm = 1 dict trong TEAMS. Điền URL, account test các role, cờ has_chatbot,
chủ đề (topic). Đặt lead = "" (không lộ thông tin cá nhân khi chia sẻ report).

Đây là file mẫu với sản phẩm hư cấu (demo.example.com) — thay bằng sản phẩm thật
của bạn trước khi chạy harness.

Sau khi chỉnh xong:
    python3 qa_harness.py demo
    python3 feature_explore.py demo
    python3 ai_probe.py demo
"""
import os

# Folder lưu screenshot + evidence. Đặt tại ~/Downloads để không bị OS xóa.
SHOT = os.path.expanduser(os.environ.get(
    "QA_SCREENSHOT_DIR",
    "~/Downloads/vibe-test-screenshots"))


def team_dir(n):
    """Thư mục evidence cho 1 sản phẩm (tạo nếu chưa có)."""
    d = os.path.join(SHOT, "T" + str(n))
    os.makedirs(d, exist_ok=True)
    return d


# ============================================================================
# DANH SÁCH SẢN PHẨM CẦN TEST — thay bằng dữ liệu thật của bạn
# ============================================================================
# Trường:
#   n           : id ngắn (dùng trong tên file screenshot, vd "demo")
#   name        : tên sản phẩm (hiển thị trên report)
#   url         : URL production/staging cần test (để "" nếu chưa deploy)
#   topic       : mô tả ngắn 1 dòng
#   lead        : người chịu trách nhiệm (để "" khi chia sẻ công khai)
#   has_chatbot : True nếu sản phẩm có trợ lý AI/chatbot → chạy Trục B
#   creds       : list account test các role: [{"u": email, "p": password, "role": "..."}]
#                 Nếu không có → harness sẽ quét on-page demo/showcase (Kỹ thuật 9.5)
# ============================================================================
TEAMS = [
    {
        "n": "demo",
        "name": "DemoKB",
        "url": "https://demo.example.com/",
        "topic": "Trợ lý tri thức nội bộ (RAG) cho đội ngũ biên tập — mẫu hư cấu",
        "lead": "",
        "has_chatbot": True,
        "creds": [
            {"u": "admin@demo.example.com", "p": "REPLACE_WITH_REAL_PASSWORD", "role": "admin"},
            {"u": "editor@demo.example.com", "p": "REPLACE_WITH_REAL_PASSWORD", "role": "editor"},
        ],
        "prev": "phiên bản trước (ghi chú so sánh, để trống nếu lần đầu test)",
    },
]
