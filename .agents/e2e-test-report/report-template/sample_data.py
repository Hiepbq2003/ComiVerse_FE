# -*- coding: utf-8 -*-
"""DỮ LIỆU MẪU cho report builder — sản phẩm hư cấu "DemoKB".

Đây là ví dụ trọn vẹn để bạn thấy hình thù một report Excellence. thay dữ liệu sản phẩm
THẬT của bạn vào đây (sau khi chạy harness), rồi chạy:

    python3 build_report_docx.py

Mọi tên người / URL / tài khoản trong file này đều HƯ CẤNG — không liên quan sản phẩm thật.
"""

# Tên 7 tiêu chí rubric (xem SKILL.md → PRODUCT QA RUBRIC)
CRIT = {
    "C1": "Feature Discovery & Coverage",
    "C2": "Auth & Access Control",
    "C3": "Core Functionality",
    "C4": "AI Quality",
    "C5": "Reliability & Production-readiness",
    "C6": "UX & Polish",
    "C7": "Deploy & Testability",
}

# Trọng số tiêu chí chính (/100). Nếu KHÔNG có chatbot → C4=0, cộng 10 cho C3 và 5 cho C5.
W = {"C1": 15, "C2": 15, "C3": 25, "C4": 15, "C5": 15, "C6": 10, "C7": 5}

# Sản phẩm mẫu (FICTIONAL). Thay bằng sản phẩm thật của bạn.
PRODUCT = {
    "name": "DemoKB",
    "topic": "Kho tri thức nội bộ + trợ lý RAG cho đội ngũ biên tập (sản phẩm hư cấu minh hoạ)",
    "url": "https://demo.example.com",
    "date": "15/07/2026",
    "has_chatbot": True,
    # level 1-5 mỗi tiêu chí (0 = UNVERIFIED, loại khỏi aggregate)
    "levels": {"C1": 5, "C2": 5, "C3": 4, "C4": 5, "C5": 5, "C6": 4, "C7": 5},
    # rationale ngắn mỗi tiêu chí (1 câu, dựa evidence)
    "rat": {
        "C1": "12 feature phát hiện qua nav đa role, 11/12 render nội dung.",
        "C2": "Login 3 role (admin/editor/viewer) verify bằng token + role-nav diff; RBAC chặt.",
        "C3": "CRUD tài liệu + phiên bản hoạt động; 1 luồng import cần làm lại khi file lớn.",
        "C4": "RAG grounded trích dẫn KB thật; câu out-of-scope thừa nhận không biết (không bịa).",
        "C5": "HTTP 200, không console error chặn luồng; backend /api/health=200 (curl độc lập).",
        "C6": "Responsive desktop+mobile, nav rõ; 1 placeholder text chưa dọn ở trang /reports.",
        "C7": "Đã deploy (URL sống), 3 account test cung cấp đầy đủ.",
    },
    # screenshot đại diện mỗi tiêu chí (file trong QA_SCREENSHOT_DIR)
    "shot": {
        "C1": "TC-E-01_dashboard.png",
        "C2": "TC-A-02_role_admin.png",
        "C3": "TC-E-04_repository.png",
        "C4": "TC-B-02_ai_response.png",
        "C5": "TC-A-01_home.png",
        "C6": "TC-E-08_permissions.png",
    },
    # tóm tắt 2-3 câu
    "summary": (
        "DemoKB là sản phẩm hư cấu minh hoạ một report Excellence. Đa role RBAC đúng (admin/editor/viewer), "
        "trợ lý RAG grounded trích dẫn tài liệu KB thật, chống bịa với câu ngoài phạm vi. "
        "1 luồng import file lớn và 1 placeholder text là điểm cần cải thiện."
    ),
    # so sánh lần trước (để trống nếu lần đầu test)
    "prev": "lần đầu kiểm thử",
}

# Chi tiết test theo từng tiêu chí — BẮT BUỘC (TS-38). Mỗi C = 1 card.
# {tc, scenario, expected, actual, verdict, shots:[filenames]}
TD = {
    "C1": {
        "tc": "TC-C1-01",
        "scenario": "Crawl nav theo từng role (public + admin + editor + viewer).",
        "expected": "Phát hiện đầy đủ feature, core feature render.",
        "actual": "12 feature phát hiện, 11 render nội dung. admin: /repository, /users, /permissions, /audit-logs; editor: /versions; viewer: /read.",
        "verdict": "PASS",
        "shots": ["TC-E-01_dashboard.png", "TC-E-04_repository.png"],
    },
    "C2": {
        "tc": "TC-C2-01",
        "scenario": "Login 3 role (admin/editor/viewer) ở fresh context riêng. Verify token store + role-nav diff.",
        "expected": "Mỗi role login → nav role-specific (RBAC đúng).",
        "actual": "PASS 3/3 — admin có /users /audit-logs, editor có /versions, viewer chỉ /read. Nav KHÁC nhau theo role. Không lộ token trong DOM.",
        "verdict": "PASS",
        "shots": ["TC-A-02_role_admin.png", "TC-A-02_role_editor.png"],
    },
    "C3": {
        "tc": "TC-C3-01",
        "scenario": "Test CRUD tài liệu + quản lý phiên bản ở /repository.",
        "expected": "Tạo/sửa/xóa tài liệu hoạt động, lưu phiên bản.",
        "actual": "PASS phần lớn — CRUD OK, phiên bản lưu đúng. 1 lỗi: import file >50MB báo raw 500 thay vì message thân thiện.",
        "verdict": "PARTIAL",
        "shots": ["TC-E-04_repository.png"],
    },
    "C4": {
        "tc": "TC-C4-01",
        "scenario": "Test trợ lý RAG ở /assistant: 1 câu domain (tìm tài liệu AI) + 1 câu out-of-scope (thời tiết).",
        "expected": "Câu domain grounded trích dẫn KB; out-of-scope → thừa nhận không biết (không bịa).",
        "actual": "PASS — câu domain trả lời kèm trích dẫn tài liệu KB thật; câu thời tiết bot nói không biết → anti-hallucination tốt.",
        "verdict": "PASS",
        "shots": ["TC-B-02_ai_response.png", "TC-B-3_ai_q1.png"],
    },
    "C5": {
        "tc": "TC-C5-01",
        "scenario": "Load home + soi console + curl endpoint health backend (độc lập frontend).",
        "expected": "HTTP 200, không console error chặn luồng, backend sống.",
        "actual": "PASS — home 200, không console error. curl /api/health=200, /api=200 (backend sống, deterministic).",
        "verdict": "PASS",
        "shots": ["TC-A-01_home.png"],
    },
    "C6": {
        "tc": "TC-C6-01",
        "scenario": "Soi dashboard + responsive desktop (1280×720) và mobile (390×844).",
        "expected": "UX chuyên nghiệp, responsive, không placeholder.",
        "actual": "PASS phần lớn — responsive OK, nav rõ. 1 placeholder 'Lorem ipsum' chưa dọn ở /reports.",
        "verdict": "PARTIAL",
        "shots": ["TC-E-08_permissions.png"],
    },
    "C7": {
        "tc": "TC-C7-01",
        "scenario": "Kiểm URL sống + account test cung cấp.",
        "expected": "Đã deploy + có account test.",
        "actual": "PASS — URL 200, 3 account test (admin/editor/viewer) cung cấp đầy đủ.",
        "verdict": "PASS",
        "shots": [],
    },
}

# Feature Inventory (kết quả FEATURE EXPLORE)
INVENTORY = [
    {"feature": "Dashboard tổng quan",   "route": "/dashboard",   "role": "public", "type": "dashboard", "status": "rendered"},
    {"feature": "Kho tài liệu",          "route": "/repository",  "role": "admin",   "type": "crud",      "status": "rendered"},
    {"feature": "Quản lý user",          "route": "/users",       "role": "admin",   "type": "crud",      "status": "rendered"},
    {"feature": "Phân quyền",            "route": "/permissions", "role": "admin",   "type": "crud",      "status": "rendered"},
    {"feature": "Nhật ký_audit",         "route": "/audit-logs",  "role": "admin",   "type": "dashboard", "status": "rendered"},
    {"feature": "Quản lý phiên bản",     "route": "/versions",    "role": "editor",  "type": "crud",      "status": "rendered"},
    {"feature": "Trợ lý AI",             "route": "/assistant",   "role": "editor",  "type": "chat",      "status": "rendered"},
    {"feature": "Chế độ chỉ đọc",        "route": "/read",        "role": "viewer",  "type": "page",      "status": "rendered"},
    {"feature": "Báo cáo",               "route": "/reports",     "role": "admin",   "type": "dashboard", "status": "rendered"},
    {"feature": "Import hàng loạt",      "route": "/import",      "role": "admin",   "type": "import",    "status": "rendered"},
    {"feature": "Cài đặt",               "route": "/settings",    "role": "admin",   "type": "form",      "status": "rendered"},
    {"feature": "Trang /legacy",         "route": "/legacy",      "role": "public",  "type": "page",      "status": "empty"},
]
