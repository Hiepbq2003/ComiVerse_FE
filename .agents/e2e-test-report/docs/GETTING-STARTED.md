# Getting Started — e2e-test-report

## 30 giây đầu tiên

1. Install (xem `docs/INSTALL.md`)
2. Mở `samples/QA-Report-Sample.docx` — đây là mẫu Excellence, đọc cấu trúc
3. Gọi skill: `/e2e-test-report [target cần test]`
4. Làm theo pipeline (chọn headless/screenshot → analyze → test → report excellence)

## Skill này làm gì

Kiểm thử toàn diện (end-to-end) + tạo **Test Report đạt chuẩn Excellence** (docx đẹp, python-docx):
- 5 tầng test: Unit / Integration / Functional / UAT / Documentation Compliance
- Schema "Software Product QA Report" 2 trục: Trục A (hệ thống /100) + Trục B (AI accuracy /10)
- Rubric C1-C7 có trọng số, level 1-5, aggregate tính lại bằng code
- Report excellence: cover + score badge màu + rubric color-coded + card test chi tiết + ảnh proof embedded

## Workflow cơ bản (test sản phẩm phần mềm)

1. `/e2e-test-report https://app-url.example.com` + account test các role
2. Skill crawl nav theo từng role → Feature Inventory → test từng feature
3. Chạy harness (`qa_harness` → `feature_explore` → `ai_probe` → curl health)
4. Chấm rubric C1-C7, sinh report docx excellence qua `report-template/build_report_docx.py`
5. Report ra `./test_report_output/` (hoặc thư mục chỉ định qua `QA_REPORT_DIR`)

## Tùy chỉnh

- `harness/qa_teams.py` — cấu hình sản phẩm cần test (URL + account các role + has_chatbot).
- `report-template/build_report_docx.py` — builder docx. Cấu hình qua env:
  - `QA_SCREENSHOT_DIR` — folder screenshot (default `~/Downloads/vibe-test-screenshots`)
  - `QA_REPORT_DIR` — folder output report (default `./test_report_output`)
- `report-template/sample_data.py` — ví dụ data test chi tiết theo tiêu chí (scenario/expected/actual/verdict/shots).
  Thay data sản phẩm của bạn vào đây.

## Mẫu Excellence đi kèm (samples/)

| File | Dùng khi |
|------|----------|
| `QA-Report-Sample.docx` | Mẫu hoàn chỉnh — đọc để thấy report Excellence đầy đủ trông thế nào |
| `SUMMARY.md` | Cách tổng hợp nhiều report thành bảng xếp hạng |

## Lưu ý quan trọng (anti-hallucination)

- "Không test được" ≠ "Bị hỏng" → ghi UNVERIFIED, không ghi FAIL
- Login phải verify bằng token + role-nav diff, KHÔNG bằng URL heuristic
- AI phải test ở đúng route (loại search box), ≥2 câu khác nhau
- Mỗi điểm rubric PHẢI có evidence: test case + screenshot + rationale
