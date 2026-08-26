# QA Harness — web-app product test automation (Playwright)

> Bộ script tham chiếu để test sản phẩm phần mềm web thật, tạo evidence chất lượng cao cho report.
> Dùng làm template — adapt config cho target của bạn.

## Yêu cầu (cài 1 lần)

```bash
pip3 install --break-system-packages playwright python-docx
python3 -m playwright install chromium
```

## Config — chỉnh `qa_teams.py`

Mỗi script đọc danh sách sản phẩm từ `qa_teams.py` (cùng folder). Mở ra, thay sản phẩm mẫu
`demo.example.com` bằng sản phẩm thật của bạn:

```python
TEAMS = [
    {
        "n": "demo",                              # id ngắn (dùng trong tên file)
        "name": "DemoKB",                         # tên hiển thị trên report
        "url": "https://your-app.example.com/",   # URL cần test
        "topic": "Mô tả 1 dòng",
        "lead": "",                               # để "" khi chia sẻ công khai
        "has_chatbot": True,                      # True → chạy Trục B (AI accuracy)
        "creds": [                                # account test các role
            {"u": "admin@your-app.example.com", "p": "...", "role": "admin"},
        ],
        "ai_route": "/assistant",                 # route AI thật (không phải /search)
    },
]
```

Nếu không có account → harness sẽ quét on-page demo/showcase trước khi ghi UNVERIFIED (Kỹ thuật 9.5).

## Thứ tự chạy (pipeline end-to-end → report chất lượng cao)

```
1. qa_harness.py <id>     → login verify (token+role-nav) + AI route detection + screenshot mỗi bước
                            Output: <SHOT>/T<id>/ev2.json + TC-A-*.png + TC-B-*.png
2. feature_explore.py <id>→ crawl nav theo từng role (fresh context) → Feature Inventory + screenshot
                            Output: <SHOT>/T<id>/inv.json + TC-E-*.png
3. ai_probe.py <id>       → (sản phẩm có chatbot) gửi câu domain + out-of-scope, capture bot bubble thật
                            Output: <SHOT>/T<id>/aifacts.json + TC-B-3/4_*.png
4. (curl) backend health  → curl /api, /health độc lập frontend (Kỹ thuật 6)
5. rubric scoring         → compute level 1-5 mỗi tiêu chí C1-C7 từ evidence, aggregate recompute
                            (xem SKILL.md → PRODUCT QA RUBRIC)
6. build_report_docx.py   → docx đẹp: cover + score badge + rubric table + CHI TIẾT TEST THEO TIÊU CHÍ
                            + feature inventory + ảnh embedded (data test chi tiết trong sample_data.py)
```

`SHOT` mặc định `~/Downloads/vibe-test-screenshots` (đổi qua env `QA_SCREENSHOT_DIR`).

## Kỹ thuật đã rèn (KHÔNG được phá)

- **Fresh context per role** (`br.new_context()` mỗi role) — chống session bleed (qa_harness).
- **Login verify 3-method**: token store + role-nav diff + screenshot, KHÔNG URL/cookie heuristic.
- **On-page credential discovery (Kỹ thuật 9.5)** — khi config không có account: quét 4 nguồn on-page
  TRƯỚC khi ghi `UNVERIFIED_NO_CRED`: (1) DOM text/panel demo/hint → `scan_text_creds()`,
  (2) button Demo/Showcase/Guest/Dùng thử → `click_demo_button()` (verify token+nav),
  (3) form prefilled → `prefilled_creds()`, (4) route `/demo` `/showcase` → `try_demo_routes()`.
  Tìm thấy → login tiếp tục bình thường (verdict `PASS_DEMO_MODE`).
  Quét + thử hết mà fail → mới `UNVERIFIED_NO_CRED` (ghi rõ `onpage_discovery.tried`).
- **AI element**: textarea + `input[type=text]` placeholder chat, LOẠI search box; ở đúng route (`/assistant`).
- **Bot bubble capture**: tìm element text 25-1500 ký tự không chứa câu gốc/footer, KHÔNG capture body[-N:].
- **AI ≥2 câu khác nhau**: phát hiện greeting canned (cùng text → scripted).
- **Backend curl độc lập** frontend.
- **SPA networkidle + selector wait**.

## Verdict taxonomy

PASS (proof dương) · FAIL (lỗi thật, reproducible) · UNVERIFIED (gated/no-account/timeout — loại khỏi aggregate) · PARTIAL · N/A.
