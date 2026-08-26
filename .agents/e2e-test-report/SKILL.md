---
name: e2e-test-report
description: >
  Kiểm thử toàn diện (end-to-end) + tạo TEST REPORT đạt chuẩn EXCELLENCE (docx đẹp, python-docx) —
  xác minh một sản phẩm vibe coding có thực sự hoạt động như mô tả hay không. Áp dụng nhiều loại test:
  Unit, Integration, Functional, UAT, Documentation Compliance. Đọc HDSD và test theo HDSD. Môi trường
  test độc lập, clean sau khi xong. Khi test SẢN PHẨM PHẦN MỀM (web app, chatbot, SaaS đa role) → dùng
  schema "Software Product QA Report" 2 trục: Trục A (QA hệ thống /100) + Trục B (độ chính xác AI/RAG /10,
  đối chiếu ground truth). Report excellence: cover + score badge màu + rubric C1-C7 color-coded +
  card test chi tiết + ảnh proof embedded. Có report mẫu Excellence trong samples/. Thao tác nguy hiểm
  → hỏi user trước.
  Trigger khi: "test X", "kiểm thử Y", "verify Z có hoạt động không", "chạy test", "UAT cho W",
  "kiểm tra theo HDSD", "test xem cái này có chạy đúng không", "QA sản phẩm", "test chatbot",
  "kiểm thử độ chính xác AI", "tạo test report", "viết QA report excellence", "e2e test".
argument-hint: [target — file, folder, URL, skill, app, API, hoặc mô tả thứ cần test]
type: skill
---

# E2E Test Report — Vibe Coding QA

> **"Không tin lời nói — chỉ tin kết quả test — và trình bày bằng chứng ở chuẩn excellence."**

---

## Persona: The Test Architect

Claude trong skill này là **Test Architect** — người thiết kế và thực thi bài kiểm thử nghiêm ngặt.

Không phải người chạy test rồi báo "có vẻ ổn". Là người thiết kế ma trận test, tạo môi trường độc lập, chạy từng kịch bản, ghi nhận chính xác pass/fail, và dọn dẹp sạch sẽ sau khi xong.

**Nguyên tắc:**
- **Test = Bằng chứng** — "có vẻ hoạt động" không đủ. Phải có test case cụ thể, kết quả cụ thể.
- **Môi trường độc lập** — test trong sandbox, không ảnh hưởng hệ thống thật. Clean sau khi xong.
- **An toàn trước** — thao tác nguy hiểm (xóa, ghi đè, gửi request thật) → hỏi user trước.
- **Đa tầng test** — từ unit test (thành phần) đến UAT test (toàn bộ theo kịch bản thực tế).
- **HDSD là chân lý** — nếu tài liệu hướng dẫn nói X, test phải xác nhận X hoạt động đúng.
- Tiếng Việt + thuật ngữ kỹ thuật Anh. Cụ thể hơn là đẹp hơn.

---

## When to Use

Trigger khi user:
- Muốn kiểm thử một skill, ứng dụng, API, website, code, quy trình, hoặc bất kỳ thứ gì
- Nói "test X", "kiểm thử Y", "verify Z", "chạy test", "UAT cho W"
- Muốn xác minh thứ gì đó hoạt động đúng như mô tả hoặc theo HDSD
- Muốn kiểm thử theo kịch bản sử dụng thực tế
- Muốn tự động hóa kiểm thử cho một tính năng

**KHÔNG trigger khi:**
- Chỉ cần review chất lượng content → dùng skill review chung
- Chỉ cần phân tích vấn đề → dùng skill giải vấn đề
- Chỉ cần tìm bug trong code → dùng review code thông thường

---

## Test Type Taxonomy

```
┌─────────────────────────────────────────────────────────────────┐
│                    MA TRẬN TEST — 5 TẦNG                         │
│                                                                   │
│  TẦNG 1: UNIT TEST                                               │
│  → Test từng thành phần nhỏ độc lập                               │
│  → Ví dụ: 1 hàm, 1 module, 1 API endpoint, 1 rule               │
│  → Input cụ thể → Output kỳ vọng → So sánh                       │
│                                                                   │
│  TẦNG 2: INTEGRATION TEST                                        │
│  → Test nhiều thành phần hoạt động cùng nhau                      │
│  → Ví dụ: API + Database, Frontend + Backend, Skill + MCP tool   │
│  → Xác minh luồng dữ liệu qua nhiều layer                        │
│                                                                   │
│  TẦNG 3: FUNCTIONAL TEST                                         │
│  → Test tính năng hoàn chỉnh theo specification                   │
│  → Ví dụ: "User có thể đăng bài thành công"                      │
│  → Input → Action → Verify output đúng spec                      │
│                                                                   │
│  TẦNG 4: UAT TEST (User Acceptance Testing)                      │
│  → Test theo kịch bản sử dụng thực tế của người dùng             │
│  → Ví dụ: "Khách hàng mua hàng từ giỏ hàng đến thanh toán"      │
│  → Chạy toàn bộ workflow như user thật                           │
│                                                                   │
│  TẦNG 5: DOCUMENTATION COMPLIANCE TEST                           │
│  → Đọc HDSD → làm theo từng bước → xác minh kết quả              │
│  → Nếu HDSD nói "nhấn X rồi thấy Y" → test chính xác điều đó    │
│  → Báo cáo: bước nào đúng, bước nào sai so với HDSD              │
└─────────────────────────────────────────────────────────────────┘
```

### Khi nào dùng tầng nào?

```
User muốn test gì?
│
├─ "Test hàm này / component này"                → TẦNG 1: Unit Test
├─ "Test kết nối giữa A và B"                    → TẦNG 2: Integration Test
├─ "Test tính năng X có hoạt động đúng spec"     → TẦNG 3: Functional Test
├─ "Test theo kịch bản người dùng thực tế"       → TẦNG 4: UAT Test
├─ "Test theo HDSD / tài liệu hướng dẫn"         → TẦNG 5: Documentation Compliance
├─ "Test toàn diện" hoặc không chỉ rõ            → TẤT CẢ 5 TẦNG (full suite)
│
└─ User có thể chọn: "chỉ Unit Test" hoặc "Unit + Integration" hoặc "full"
```

---

## Test Environment Management

### Nguyên tắc: Sandbox First

```
MỌI test phải chạy trong môi trường độc lập (sandbox):

1. ISOLATED — không ảnh hưởng hệ thống thật, dữ liệu thật, user thật
2. REPRODUCIBLE — cùng input → cùng kết quả mỗi lần chạy
3. CLEAN — sau khi test xong → dọn dẹp sạch (xóa file tạm, reset state)
4. SAFE — thao tác nguy hiểm → hỏi user trước, không tự động thực hiện

Triệt lý:
  "Test như khách thuê phòng khách sạn — dùng xong thì trả lại phòng sạch sẽ."
```

### Môi trường test tiêu chuẩn

```
STANDARD SANDBOX:
  → Thư mục tạm: /tmp/vibe-test-[timestamp]/
  → Tạo tại start, xóa tại end
  → Mọi file test nằm trong sandbox, không nằm ngoài

DATABASE/API:
  → Dùng test database / staging API khi có
  → Nếu chỉ có production → hỏi user trước khi test
  → Không ghi/xóa dữ liệu thật mà không được phép

NETWORK:
  → Test URL/API: dùng staging khi có
  → Nếu phải test production → chỉ READ (GET), không WRITE (POST/PUT/DELETE)
     trừ khi user xác nhận

PROCESS/STATE:
  → Lưu state trước khi test (snapshot)
  → Restore state sau khi test (rollback)
  → Nếu không thể rollback → hỏi user trước
```

### Safety Classification

```
MỌI thao tác test được phân loại an toàn:

🟢 SAFE — tự động thực hiện:
  - Đọc file, đọc API response (GET)
  - Tạo file tạm trong /tmp/
  - Chạy code trong sandbox
  - Phân tích output
  - Kiểm tra cấu trúc, format, schema

🟡 CAUTION — thông báo cho user, rồi thực hiện:
  - Gửi request POST/PUT đến staging API
  - Tạo record tạm trong test database
  - Chạy process tốn tài nguyên (build, compile)

🔴 DANGEROUS — PHẢI hỏi user, chờ xác nhận rồi mới thực hiện:
  - Ghi/xóa dữ liệu production
  - Gửi email/message thật
  - Thay đổi configuration của hệ thống
  - Chạy lệnh destructive (rm, DROP, truncate)
  - Tương tác với external service thật (payment, notification)
  - Bất kỳ hành động KHÔNG THỂ undo
```

---

## Screenshot Mode

### Nguyên tắc

Trước MỖI lần chạy test, **LUÔN hỏi user** chọn chế độ:

```
═════════════════════════════════════════════════════
CHẾ ĐỘ CHẠY TEST — Chọn một:
═════════════════════════════════════════════════════

1. 🖥️ HEADLESS — chạy im lặng, chỉ báo kết quả
   → Nhanh, không mở app, không chụp màn hình
   → Phù hợp khi đã quen hoặc chạy lại lần 2+

2. 📸 SCREENSHOT — chụp màn hình mỗi bước test
   → Mở file/app phù hợp, chụp window-specific (KHÔNG fullscreen)
   → Chụp screenshot tự động theo từng test step
   → Lưu vào folder dễ tìm, KHÔNG xóa sau khi xong
   → Phù hợp khi cần bằng chứng hình ảnh, báo cáo, hoặc lần đầu test

Chọn [1] hoặc [2]:
═════════════════════════════════════════════════════
```

### Screenshot workflow

Khi user chọn chế độ SCREENSHOT:

**Yêu cầu cài đặt (một lần):**
```bash
pip3 install --break-system-packages pyobjc-framework-Quartz ipykernel jupyter_client nbconvert nbformat
python3 -m ipykernel install --user --name python3
```

**Nguyên tắc bắt buộc — KHÔNG chụp fullscreen:**
- Chụp CHỈ window của app mục tiêu, không chụp toàn màn hình
- Fullscreen capture bị lẫn windows khác + user đang dùng máy → nhiễu loạn
- Dùng `screencapture -l <CGWindowID> -o` để chụp từng window riêng biệt

```
1. TẠO FOLDER screenshot:
   → Vị trí: ~/Downloads/vibe-test-screenshots-[YYYY-MM-DD_HHMMSS]/
   → Hoặc: [current-dir]/vibe-test-screenshots-[YYYY-MM-DD_HHMMSS]/
   → Ưu tiên ~/Downloads vì dễ tìm bằng Finder
   → KHÔNG đặt trong /tmp/ — sẽ bị xóa tự động

2. MỖI BƯỚC TEST — phân loại theo loại file:

   LOẠI 1 — File tĩnh (.md, .json, .py, .csv, .docx, .txt):
   a. open -a "Antigravity IDE" "/path/to/file"
   b. Activate: osascript -e 'tell application "Antigravity IDE" to activate'
   c. Lấy CGWindowID qua Quartz API → screencapture -l <ID> -o [path]

   LOẠI 2 — Cấu trúc thư mục (folder):
   a. open "/path/to/folder"
   b. Activate Finder → AppleScript window ID → screencapture -l <ID> -o [path]

   LOẠI 3 — Jupyter Notebook (.ipynb):
   a. Patch paths (nếu dùng /content/ Colab → local path)
   b. Execute: jupyter nbconvert --to notebook --execute --inplace
   c. Mở executed notebook trong Antigravity IDE
   d. Quartz CGEvent scroll xuống cuối (80x800px) → scroll ngược lên 1/2 screen (3x170px)
   e. Capture window

3. SAU KHI CHẠY XONG TẤT CẢ TEST:
   → Folder screenshot ĐƯỢC GIỮ LẠI
   → Thông báo cho user vị trí folder: "Screenshots tại ~/Downloads/vibe-test-screenshots-..."
   → KHÔNG xóa folder screenshot — đây là artifact có giá trị
```

**Cách lấy CGWindowID:**

Antigravity IDE là Electron app — AppleScript `get id of front window` KHÔNG hoạt động.
PHẢI dùng Quartz API (owner name = `"Antigravity IDE"`, KHÔNG phải `"Electron"`):

```bash
WIN_ID=$(python3 -c "
import Quartz
for w in Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID):
    if 'Antigravity' in w.get('kCGWindowOwnerName','') and w.get('kCGWindowBounds',{}).get('Height',0) > 100:
        print(w['kCGWindowNumber']); break
" 2>/dev/null)
```

Finder dùng AppleScript:
```bash
WIN_ID=$(osascript -e 'tell application "Finder" to get id of front window')
```

**Capture functions sẵn dùng:**

```bash
# File tĩnh — mở trong Antigravity IDE và chụp window
capture_ag_window() {
  local OUTPUT="$1"
  local OPEN_FILE="$2"

  [ -n "$OPEN_FILE" ] && { open -a "Antigravity IDE" "$OPEN_FILE"; sleep 2.5; }
  osascript -e 'tell application "Antigravity IDE" to activate'
  sleep 1

  WIN_ID=$(python3 -c "
import Quartz
for w in Quartz.CGWindowListCopyWindowInfo(Quartz.kCGWindowListOptionOnScreenOnly, Quartz.kCGNullWindowID):
    if 'Antigravity' in w.get('kCGWindowOwnerName','') and w.get('kCGWindowBounds',{}).get('Height',0) > 100:
        print(w['kCGWindowNumber']); break
" 2>/dev/null)

  [ -z "$WIN_ID" ] && { echo "ERROR: No AG window"; return 1; }
  screencapture -l "$WIN_ID" -o "$OUTPUT"
  echo "OK: $(basename "$OUTPUT") — $(stat -f %z "$OUTPUT") bytes"
}

# Folder — mở trong Finder và chụp window
capture_finder() {
  local FOLDER="$1"
  local OUTPUT="$2"

  open "$FOLDER"; sleep 1.5
  osascript -e 'tell application "Finder" to activate'; sleep 0.5
  WIN_ID=$(osascript -e 'tell application "Finder" to get id of front window')
  screencapture -l "$WIN_ID" -o "$OUTPUT"
  echo "OK: $(basename "$OUTPUT") — $(stat -f %z "$OUTPUT") bytes"
}
```

**Notebook scroll-and-capture (Python):**

```bash
# 1. Patch + execute notebook
execute_notebook() {
  local SRC="$1" DEST="$2" LOCAL_ROOT="${3:-/tmp/test-workspace}"
  python3 -c "
import json
with open('$SRC') as f: nb = json.load(f)
for cell in nb.get('cells', []):
    if cell.get('cell_type') == 'code':
        src = cell.get('source', '')
        if isinstance(src, list): src = ''.join(src)
        cell['source'] = src.replace('/content/', '$LOCAL_ROOT/')
with open('$DEST', 'w') as f: json.dump(nb, f, ensure_ascii=False, indent=1)
"
  mkdir -p "$LOCAL_ROOT"
  jupyter nbconvert --to notebook --execute --inplace \
      --ExecutePreprocessor.timeout=120 --ExecutePreprocessor.kernel_name=python3 \
      "$DEST" 2>&1
}

# 2. Scroll to last output + capture (dùng Quartz CGEvent)
# Scroll xuống cuối: 80 iterations x 800px
# Scroll ngược lên 1/2 screen: 3 iterations x 170px
# → Hiển thị đúng output cell cuối cùng với context
```

**Lưu ý quan trọng:**

| Vấn đề | Giải pháp |
|---------|-----------|
| AG IDE là Electron → AppleScript `get id` KHÔNG hoạt động | Dùng Quartz API, owner = `"Antigravity IDE"` |
| Page Down keystroke KHÔNG scroll notebook trong VS Code | Dùng Quartz CGEvent scroll wheel events |
| Notebook dùng `/content/` (Colab path) | Patch sang local path trước khi execute |
| Scroll tới cuối quá tay → mất output cuối | Scroll xuống cuối, rồi scroll NGƯỢC lên 1/2 screen |
| Notebook chưa chạy → không có output cells | `jupyter nbconvert --execute` trước khi mở trong AG IDE |

### Quy tắc đặt tên screenshot

```
Pattern: [TC-ID]_step[N]_[mo-ta].png

TC-ID format:
  - Unit test:       TC-U[Layer]-[Number]   → TC-U1-01, TC-U1-02
  - Integration:     TC-I[Layer]-[Number]   → TC-I2-01, TC-I2-02
  - Functional:      TC-F[Layer]-[Number]   → TC-F3-01, TC-F3-02
  - UAT:             TC-UA[Layer]-[Number]  → TC-UA4-01, TC-UA4-02
  - Doc Compliance:  TC-D[Layer]-[Number]   → TC-D5-01, TC-D5-02

Ví dụ:
  TC-U1-01_step1_file-exists.png
  TC-U1-01_step2_file-content.png
  TC-F3-01_step1_script-run.png
  TC-F3-01_step2_output-json.png
  TC-I2-01_step1_intake-output.png
  TC-I2-01_step2_validator-result.png
```

### Khi nào mở app bằng gì

```
Loại file         → Phần mềm mở                → Capture method
─────────────────────────────────────────────────────────────────────
.docx, .txt, .md  → Antigravity IDE            → capture_ag_window
.json             → Antigravity IDE            → capture_ag_window
.py               → Antigravity IDE            → capture_ag_window
.ipynb            → Antigravity IDE (execute trước!) → scroll_and_capture
.csv              → Antigravity IDE            → capture_ag_window
.pdf              → Preview                    → window-specific capture
Folder            → Finder                     → capture_finder
URL / Website     → Chrome                     → window-specific capture
```

---

## Execution Pipeline

```
NHẬN INPUT: target cần test + loại test (hoặc "full suite")
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 0: MODE SELECT — Chọn chế độ chạy (BẮT BUỘC)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ HỎI user: "Chạy headless (1) hay có screenshot (2)?"
→ Lưu lựa chọn vào biến SCREENSHOT_MODE (true/false)
→ Nếu SCREENSHOT_MODE → tạo folder ~/Downloads/vibe-test-screenshots-[timestamp]/
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1: ANALYZE — Phân tích mục tiêu test (2-3 phút)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Xác định target: file, folder, URL, API, app, skill, workflow
→ Đọc specification / documentation / HDSD nếu có
→ Xác định loại test cần chạy (tầng 1-5)
→ Liệt lịch test cases dự kiến
→ Phân loại safety cho mỗi test case
→ Confirm test plan với user
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2: SETUP — Tạo môi trường test (1-2 phút)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Tạo sandbox: /tmp/vibe-test-[timestamp]/
→ Nếu SCREENSHOT_MODE → tạo screenshot folder: ~/Downloads/vibe-test-screenshots-[timestamp]/
→ Chuẩn bị test data (mock data, fixtures)
→ Snapshot state nếu cần rollback
→ Verify môi trường sẵn sàng
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3: EXECUTE — Chạy test cases (5-15 phút)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Chạy từng test case theo test plan
→ Ghi nhận kết quả: PASS / FAIL / ERROR / SKIP
→ Nếu SCREENSHOT_MODE:
    → Mở file/app phù hợp (xem bảng "Khi nào mở app bằng gì")
    → Chụp window-specific: screencapture -l <CGWindowID> -o [path]
    → Notebook (.ipynb): execute trước, scroll tới output cuối rồi chụp
    → Lưu vào screenshot folder
→ Nếu FAIL → ghi nhận chi tiết: expected vs actual
→ Nếu phát hiện thêm test case → thêm vào plan
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4: REPORT — Tổng hợp kết quả (2-3 phút)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Aggregat kết quả tất cả test cases
→ Tính test pass rate
→ Liệt kê tất cả failure với chi tiết
→ Đề xuất fix cho từng failure
→ Nếu SCREENSHOT_MODE → liệt kê vị trí screenshot folder + số lượng ảnh
→ Output: Test Report
    ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5: CLEANUP — Dọn dẹp môi trường test (1 phút)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
→ Xóa sandbox /tmp/vibe-test-[timestamp]/
→ Restore state nếu có snapshot
→ Xóa test data tạm
→ ⚠️ KHÔNG XÓA screenshot folder — GIỮ LẠI cho user
→ Verify cleanup hoàn tất (trừ screenshot folder)
→ Report: "Môi trường test đã được dọn dẹp. Screenshots tại ~/Downloads/vibe-test-screenshots-..."
```

---

## Test Case Design

### Test Case Template

```markdown
### TC-[LAYER]-[NUMBER]: [Tên test case]

| Field | Value |
|-------|-------|
| **Tầng** | [Unit / Integration / Functional / UAT / Doc Compliance] |
| **Mô tả** | [Test cái gì, xác minh điều gì] |
| **Precondition** | [Điều kiện cần có trước khi test] |
| **Input** | [Dữ liệu/tham số đầu vào] |
| **Steps** | [Các bước thực hiện] |
| **Expected Output** | [Kết quả kỳ vọng] |
| **Safety** | [🟢 Safe / 🟡 Caution / 🔴 Dangerous] |
| **Actual Output** | [Điền sau khi chạy] |
| **Result** | [PASS / FAIL / ERROR / SKIP] |
| **Screenshot** | [Đường dẫn file screenshot, nếu chế độ screenshot] |
| **Note** | [Ghi chú thêm nếu có] |
```

### Unit Test Cases (Tầng 1)

```
Mục tiêu: Test từng thành phần nhỏ độc lập

Pattern:
  1. Identify unit: hàm, method, API endpoint, rule, component
  2. Define input variations: normal, edge, boundary, invalid
  3. Define expected output cho mỗi variation
  4. Run → compare actual vs expected
  5. Report: pass/fail per variation

Loại input cần test:
  - Happy path: input hợp lệ, chuẩn → output đúng
  - Edge case: input boundary (giá trị min/max, rỗng, null)
  - Invalid input: input sai format, sai kiểu → error handling đúng
  - Missing input: thiếu tham số bắt buộc → error message đúng
```

### Integration Test Cases (Tầng 2)

```
Mục tiêu: Test nhiều thành phần hoạt động cùng nhau

Pattern:
  1. Identify integration point: A → B
  2. Verify data flows correctly từ A sang B
  3. Verify error handling khi A hoặc B fail
  4. Verify data format compatibility

Test scenarios:
  - Data flow: A gửi X → B nhận đúng X
  - Error propagation: A fail → B xử lý đúng
  - Timing: A chậm → B timeout đúng
  - Format: A output format → B input format compatible
```

### Functional Test Cases (Tầng 3)

```
Mục tiêu: Test tính năng hoàn chỉnh theo specification

Pattern:
  1. Đọc specification/requirement của tính năng
  2. Tạo test case cho mỗi requirement
  3. Chạy end-to-end: input → process → output
  4. Verify output đúng specification

Coverage:
  - Mỗi requirement = ít nhất 1 test case
  - Happy path + alternate path + error path
  - Input/output đúng specification format
```

### UAT Test Cases (Tầng 4)

```
Mục tiêu: Test theo kịch bản sử dụng thực tế của người dùng

Pattern:
  1. Xác định persona (ai sử dụng?)
  2. Xác định kịch bản (họ làm gì trong thực tế?)
  3. Thực hiện đúng bước user sẽ làm
  4. Verify kết quả cuối cùng đúng kỳ vọng của user
  5. Verify trải nghiệm: có dễ dùng không? có confusing không?

Kịch bản UAT mẫu:
  - "User mới lần đầu: mở app → đăng ký → dùng thử tính năng X"
  - "User quen: mở app → dùng phím tắt → hoàn thành task trong 30 giây"
  - "Admin: đăng nhập → cấu hình → thêm user → verify user mới hoạt động"
```

### Documentation Compliance Test Cases (Tầng 5)

```
Mục tiêu: Đọc HDSD → làm theo → xác minh kết quả

Pattern:
  1. Đọc tài liệu hướng dẫn sử dụng (HDSD)
  2. Cho mỗi bước trong HDSD:
     a. Thực hiện đúng như hướng dẫn
     b. Ghi nhận kết quả thực tế
     c. So sánh với kết quả HDSD mô tả
  3. Report: bước nào đúng, bước nào sai, bước nào thiếu

Output đặc trưng:
  - Compliance Rate: X/Y bước đúng theo HDSD
  - Deviation List: bước nào sai lệch, sai lệch thế nào
  - Missing Steps: bước nào trong HDSD không thể thực hiện
  - Undocumented Behavior: hành vi nào xảy ra nhưng HDSD không đề cập
```

---

## Test Report Template

```markdown
# Test Report — [Target Name]

**Ngày test:** [YYYY-MM-DD HH:MM]
**Người test:** e2e-test-report
**Target:** [file/path/URL/app/skill]
**Phiên bản:** [version nếu có]
**Môi trường test:** [sandbox path, staging URL, etc.]
**HDSD tham chiếu:** [tài liệu đã dùng, nếu có]

---

## Tổng quan

| Metric | Value |
|--------|-------|
| **Tổng test cases** | [X] |
| **PASS** | [Y] 🟢 |
| **FAIL** | [Z] 🔴 |
| **ERROR** | [W] 🟡 |
| **SKIP** | [V] ⚪ |
| **Pass Rate** | [Y/X × 100]% |

## Kết quả theo tầng

| Tầng | Pass | Fail | Error | Skip | Total |
|------|------|------|-------|------|-------|
| T1 — Unit | [Y] | [Z] | [W] | [V] | [X] |
| T2 — Integration | [Y] | [Z] | [W] | [V] | [X] |
| T3 — Functional | [Y] | [Z] | [W] | [V] | [X] |
| T4 — UAT | [Y] | [Z] | [W] | [V] | [X] |
| T5 — Doc Compliance | [Y] | [Z] | [W] | [V] | [X] |

## Chi tiết Failure

### FAIL: TC-[ID] — [Tên test case]
- **Expected:** [kỳ vọng]
- **Actual:** [thực tế]
- **Gốc lỗi:** [nguyên nhân suy đoán]
- **Đề xuất fix:** [cách sửa]

[Repeat cho mỗi failure]

## Documentation Compliance (nếu có)

| Bước HDSD | Kết quả | Chi tiết |
|-----------|---------|---------|
| Bước 1: [mô tả] | ✅ PASS | Kết quả đúng như mô tả |
| Bước 2: [mô tả] | ❌ FAIL | HDSD nói X, thực tế là Y |
| Bước 3: [mô tả] | ⚠️ DEVIATION | HDSD thiếu ghi chú về Z |

## Screenshots (nếu chế độ screenshot)
- **Folder:** ~/Downloads/vibe-test-screenshots-[timestamp]/
- **Số lượng:** [N] ảnh
- **Danh sách:**
  1. [TC-ID]_step[N]_[mo-ta].png — [mô tả ngắn]
  2. ...

## Cleanup Status
- [x] Sandbox đã xóa
- [x] Test data tạm đã dọn
- [x] State đã restore (nếu có snapshot)
- [x] Screenshot folder đã GIỮ LẠI (không xóa)

## Kết luận

[1-2 câu: target có hoạt động đúng như mô tả không? Những vấn đề chính là gì?]

## Khuyến nghị

1. [Khuyến nghị fix 1]
2. [Khuyến nghị fix 2]
3. [Khuyến nghị cải thiện test coverage]
```

---

## Test Execution Strategy

### Priority Order

```
Khi chạy full suite, test theo thứ tự:

1. TẦNG 1: Unit Test (nhanh nhất, phát hiện lỗi cơ bản)
   → Nếu unit test fail nhiều → DỪNG → báo user → không cần test tầng cao hơn
   → Lý do: lỗi tầng thấp sẽ gây lỗi tầng cao, test thêm vô ích

2. TẦNG 2: Integration Test (sau khi unit test pass)
   → Nếu integration fail → phân tích: lỗi ở thành phần nào?

3. TẦNG 3: Functional Test (sau khi integration pass)
   → Test từng tính năng theo spec

4. TẦNG 4: UAT Test (sau khi functional pass)
   → Test theo kịch bản user

5. TẦNG 5: Documentation Compliance (có thể chạy song song với T3-T4)
   → Đọc HDSD → verify từng bước

Fail-fast rule:
  → Nếu T1 có >50% fail → DỪNG, báo user
  → Nếu T2 có >50% fail → DỪNG, báo user
  → T3-T5: chạy hết dù có fail, ghi nhận đầy đủ
```

### Parallel Testing

```
Khi có nhiều test case độc lập:
  → Chạy song song để tiết kiệm thời gian
  → Mỗi test case trong sandbox riêng (nếu cần)
  → Merge kết quả ở Phase 4

KHÔNG chạy song song khi:
  - Test case phụ thuộc kết quả của test case khác
  - Test case chia sẻ tài nguyên (database, file, port)
  - Test case có side effect ảnh hưởng lẫn nhau
```

---

## Specialized Test Scenarios

### Test Skill (SKILL.md)

```
Khi test target là một Claude Code skill (hoặc bất kỳ agent skill tương thích):

TẦNG 1 — Unit Test:
  - SKILL.md parse được YAML frontmatter không?
  - Frontmatter có đủ name, description?
  - Body không rỗng (>100 bytes)?
  - Mọi referenced file tồn tại?

TẦNG 2 — Integration Test:
  - Skill invoke được không? (/skill-name)
  - Skill có nhận argument không?
  - Skill có gọi tools đúng không? (Read, Write, Bash, WebSearch...)

TẦNG 3 — Functional Test:
  - Input hợp lệ → output đúng loại, đúng format?
  - Input thiếu → hỏi user thêm (không crash)?
  - Input sai → error message rõ ràng?

TẦNG 4 — UAT Test:
  - User mới invoke skill lần đầu → có hướng dẫn rõ không?
  - User chạy theo steps trong skill → hoàn thành được task?
  - Output chất lượng đủ dùng?

TẦNG 5 — Doc Compliance:
  - Skill mô tả "khi nào dùng" → test đúng trigger condition
  - Skill mô tả "pipeline" → test đúng flow
  - Skill mô tả "rules" → test rule được enforce
```

### Test API / Backend

```
Khi test target là API:

TẦNG 1 — Unit Test:
  - Mỗi endpoint: GET/POST/PUT/DELETE
  - Status code đúng: 200, 400, 401, 404, 500
  - Response schema đúng

TẦNG 2 — Integration Test:
  - POST tạo resource → GET lấy lại đúng
  - Auth flow: login → token → authorized request
  - Error chain: upstream fail → downstream xử lý đúng

TẦNG 3 — Functional Test:
  - CRUD hoàn chỉnh: Create → Read → Update → Delete
  - Filtering, pagination, sorting
  - Rate limiting, throttling

TẦNG 4 — UAT Test:
  - Luồng user thật: đăng ký → dùng → logout
  - Multi-step workflow
```

### Test Website / UI

```
Khi test target là website/UI:

TẦNG 1 — Unit Test:
  - Mỗi component render được không?
  - Mỗi nút/button có clickable?
  - Form validation hoạt động?

TẦNG 2 — Integration Test:
  - Navigation giữa trang
  - Form submit → data gửi đúng
  - API call từ UI → response hiển thị đúng

TẦNG 3 — Functional Test:
  - Mỗi tính năng theo spec
  - Responsive design: mobile + desktop
  - Accessibility: contrast, keyboard nav

TẦNG 4 — UAT Test:
  - User thật thực hiện task thật
  - Chụp screenshot mỗi bước
  - Verify visual output

Công cụ: trình duyệt headless (Playwright) qua MCP chrome-devtools
(navigate, snapshot, screenshot, click, fill)
```

### Test Sản phẩm phần mềm (Software Product QA)

```
Khi test target là một sản phẩm phần mềm hoàn chỉnh (web app, chatbot, SaaS,
platform đa role...) → dùng schema "Software Product QA Report" ở section dưới.
Đặc biệt khi sản phẩm có thành phần AI/RAG/chatbot → bắt buộc chạy CẢ 2 trục:
Trục A (hệ thống) + Trục B (độ chính xác AI).

Đặc trưng khác với test đơn lẻ:
  - Đa role: ADMIN / EDITOR / VIEWER / guest — login đủ role, click toàn luồng
  - Đa môi trường: backend (Cloud Run/API) + frontend (SPA/Pages) + trang nhúng
  - Soi Network & Console sau mỗi thao tác
  - Đa viewport: desktop (1280×720) + mobile (390×844)
  - Đối chiếu ground truth với nguồn chính thức cho mọi câu trả lời AI
  - Bằng chứng hình ảnh mỗi lỗi + mỗi kịch bản accuracy

Tránh thao tác phá dữ liệu: không Suspend tài khoản test, không gửi tin thật.
```

### PHASE BẮT BUỘC — FEATURE EXPLORE (chạy TRƯỚC khi test sản phẩm)

> **Bài học thực tế:** test mà không khám phá hết feature = chấm hời hợt. Báo cáo
> test mỗi sản phẩm chỉ vài trang mà bỏ sót feature chính là thất bại. **Phải lập
> Feature Inventory trước, rồi test từng feature.**

**Mục tiêu:** khám phá TẤT CẢ feature product cung cấp → lập Feature Inventory → test từng cái.

```
BƯỚC 1 — CRAWL nav/routes theo từng role
  → Login mỗi role (theo Kỹ thuật 1: fresh context)
  → Thu thập: tất cả <a href>, button có label, menu items, sidebar, tab, modal triggers
  → Với SPA: lấy danh sách route từ router (đọc nav links + thử /dashboard, /admin, ...)
  → Mỗi role cho nav KHÁC NHAU → crawl từng role riêng (RBAC surfaces feature khác nhau)

BƯỚC 2 — ENUMERATE page/function
  → Mỗi route/link = 1 potential feature → goto, đợi render, ghi:
     - tên feature (label) + route + role nhìn thấy
     - loại: form / CRUD / dashboard / chat / report / import-export / settings
     - có input/button actionable không
     - screenshot feature inventory (TC-E-NN_stepM_feature-name.png)

BƯỚC 3 — LẬP FEATURE INVENTORY (bảng)
  | ID | Feature | Route | Role | Loại | Test? | Screenshot |
  |----|---------|-------|------|------|-------|------------|
  | F-01 | Quản lý user | /admin/users | ADMIN | CRUD | ✓ | ... |
  | F-02 | Trợ lý AI | /assistant | EDITOR | chat | ✓ | ... |

BƯỚC 4 — TEST từng feature trong inventory
  → Mỗi feature = ≥1 test case (happy path + 1 edge case nếu quan trọng)
  → Ghi PASS/FAIL/UNVERIFIED + screenshot + map về tiêu chí rubric (xem section Rubric)
  → KHÔNG kết luận "product OK" khi còn feature UNTESTED trong inventory
```

**Feature Inventory MINIMUM** trước khi viết report: nếu chỉ test homepage + login → CHƯA ĐỦ. Phải liệt kê hết feature phát hiện được (kể cả feature gated/không test được → ghi UNVERIFIED trong inventory, không bỏ qua).

---

## Software Product QA Report Schema

> Schema báo cáo QA sản phẩm phần mềm chuyên nghiệp — **2 trục song song**.
> Trục A = QA toàn hệ thống (functional). Trục B = Độ chính xác AI/RAG (khi có chatbot).

### Khi nào dùng schema này?

```
Dùng khi target LÀ sản phẩm phần mềm (không phải hàm/API/skill đơn lẻ):
  ✓ Web app đa role, SaaS, platform
  ✓ Chatbot / AI assistant / RAG system
  ✓ Sản phẩm có cả UI + backend + (tùy chọn) AI
KHÔNG dùng khi:
  ✗ Test 1 hàm, 1 API endpoint, 1 skill → dùng Test Case Template ở trên
  ✗ Chỉ review content
```

### Cấu trúc báo cáo — 2 trục

```
┌─────────────────────────────────────────────────────────────────┐
│              SOFTWARE PRODUCT QA REPORT — 2 TRỤC                │
│                                                                   │
│  TRỤC A · QA TOÀN HỆ THỐNG (PHẦN A)                            │
│  → Functional/Integration/UAT/Doc-Compliance qua mọi role        │
│  → Output: điểm /100 + bộ đếm severity + bug cards               │
│                                                                   │
│  TRỤC B · ĐỘ CHÍNH XÁC AI/RAG (PHẦN B) — chỉ khi có chatbot     │
│  → Kịch bản hội thoại đa lượt, đối chiếu ground truth            │
│  → Output: điểm /10 + bảng chấm điểm accuracy + findings          │
│                                                                   │
│  Báo cáo KHÔNG sửa code (report-only) — chỉ ghi nhận + gợi ý fix │
└─────────────────────────────────────────────────────────────────┘
```

### Trang bìa (cover) — metadata

```markdown
# [Tên sản phẩm] · QA Report

**Báo cáo kiểm thử chất lượng (QA) tổng hợp**
[Tên hệ thống] — [môi trường: staging/production]

| Trường | Giá trị |
|--------|---------|
| URL kiểm thử | [https://...] |
| Ngày test | [DD/MM/YYYY] |
| Backend | [Cloud Run / API host / ...] |
| Frontend | [SPA / Cloudflare Pages / ...] |
| Phạm vi | [role1 · role2 · role3 · trang nhúng · chatbot] |
| Chế độ | Report-only (không sửa code) |
```

### Bảng điểm tổng (score dashboard)

```markdown
## Điểm tổng

| Trục | Điểm | Chi tiết severity |
|------|------|--------------------|
| **PHẦN A · QA hệ thống** | [NN]/100 | [n] CRIT · [n] HIGH · [n] MED · [n] LOW |
| **PHẦN B · Độ chính xác chatbot** | [N.N]/10 | [n] ĐÚNG · [n] MỘT PHẦN · [n] LỖI · [n] SAI N.TRỌNG |

Tóm tắt ngắn 2-3 câu:
- Phần A: [n] lỗi (loại lỗi chính) kèm kịch bản tái hiện & ảnh.
- Phần B: [n] kịch bản hội thoại đa lượt, đối chiếu nguồn [tên nguồn] chính thức.
```

### A1. Phương pháp & phạm vi

```markdown
## A1. Phương pháp & phạm vi

[Trình duyệt headless / manual / công cụ] mô phỏng người dùng thật: đăng nhập
đủ [n] role, click toàn bộ luồng chính, soi Network & Console sau mỗi thao tác,
test desktop (1280×720) và mobile (390×844).

| Khu vực | Đã kiểm thử |
|---------|-------------|
| Auth | Đăng nhập đúng/sai, submit rỗng, điều hướng |
| [Role 1] | [dashboard/luồng chính] |
| [Role 2] | [tính năng quản trị] |
| /[trang nhúng] | [widget nhúng vào site demo] |
| Responsive | [homepage desktop & mobile, lazy-load] |

Đã tránh thao tác phá dữ liệu: [liệt kê giới hạn].
```

### A2. Bảng tổng hợp lỗi hệ thống (bug summary)

```markdown
## A2. Bảng tổng hợp lỗi hệ thống

| ID | Mức độ | Vấn đề | Khu vực |
|----|--------|--------|---------|
| A-01 | CRITICAL | [tóm tắt lỗi 1 dòng] | [khu vực] |
| A-02 | HIGH | [tóm tắt] | [khu vực] |
| A-03 | MEDIUM | [tóm tắt] | [khu vực] |
| A-04 | LOW | [tóm tắt] | [khu vực] |

Severity scale: CRITICAL (sập/chặn luồng chính) > HIGH (lỗi nghiêm trọng có workaround)
> MEDIUM (chất lượng kém) > LOW (UX/cosmetic).
```

### A3. Bug card chi tiết (schema mỗi lỗi)

> Mỗi lỗi = 1 card với 5 trường bắt buộc + ảnh chứng cứ.
> Đây là phần cốt lõi — tái hiện được + chỉ ra nguyên nhân gốc + gợi ý fix.

```markdown
## A-XX · [MỨC ĐỘ] · [Tên lỗi ngắn]

**HIỆN TƯỢNG**
[1-3 câu mô tả điều gì xảy ra khi quan sát bằng mắt/mạng]

**KỊCH BẢN TÁI HIỆN**
1. [Bước 1 — mở trang/vào role]
2. [Bước 2 — thao tác]
3. [Bước 3 — input cụ thể]
4. [Bước 4 — quan sát Network/Console]

**NGUYÊN NHÂN GỐC**
[Root cause thật — không phải triệu chứng. VD: "POST về domain static
thay vì backend API → 405". So sánh với luồng đúng nếu có.]

**GHI CHÚ DEV**
[Hướng fix cụ thể, theo thứ tự ưu tiên. VD: "1. Validation client; 2. Backend
trả 400 thay vì 500; 3. Message thân thiện thay raw error."]

**ẢNH CHỨNG CỨ**
[Screenshot window-specific: TC-A-XX_step[N]_[mo-ta].png]
```

### A4. Phần hoạt động tốt (passes)

```markdown
## A4. Phần hệ thống hoạt động tốt

✓ [Auth]: [các role đăng nhập đúng, điều hướng đúng dashboard]
✓ [Homepage]: [render đầy đủ, lazy-load, responsive OK]
✓ [Admin]: [thao tác CRUD/thay đổi trạng thái → status đúng]
✓ [Staff]: [luồng chính hoạt động, AI Draft điền draft thật]

Đính chính (nếu có): loại bỏ mục nào là false positive + lý do.
```

### B1. Phương pháp & nguồn đối chiếu (ground truth) — Trục B

```markdown
## B1. Phương pháp & nguồn đối chiếu

Chạy hội thoại thật rồi đối chiếu từng câu trả lời với nguồn chính thức để xác định
Đúng / Một phần / Sai.

| Nguồn đối chiếu (ground truth) | Dữ kiện xác minh |
|--------------------------------|-------------------|
| [URL nguồn chính thức] | [danh sách dữ kiện] |
| [URL policy] | [yêu cầu/số liệu] |
| [Web search] | [dữ kiện phụ chứng] |
```

### B2. Bảng điểm độ chính xác (accuracy scoring) — Trục B

```markdown
## B2. Bảng điểm độ chính xác (đã đối chiếu)

Verdict taxonomy:
  ĐÚNG · MỘT PHẦN · SAI N.TRỌNG · LỖI · TỐT (chống bịa)

| KB | Chủ đề | Kết luận | Ghi chú đối chiếu |
|----|--------|----------|--------------------|
| A | [chủ đề] | [VERDICT] | [đúng/sai gì, so với nguồn] |
| B | [chủ đề] | [VERDICT] | [...] |
| D+H | [chủ đề] | SAI N.TRỌNG | [...] |
```

### B3. Kịch bản hội thoại đa lượt (conversation scenario) — Trục B

> Mỗi kịch bản = nhiều lượt 👤 user ↔ 🤖 bot, kèm CHUẨN ĐỐI CHIẾU + KẾT LUẬN.

```markdown
## KỊCH BẢN [X] · [VERDICT] · [Tên chủ đề] ([n] lượt — [trọng tâm])

👤 [Câu user lượt 1]
🤖 [Câu bot lượt 1]

👤 [Câu user lượt 2 — thử coreference: "ngành đó", "nó", "trong số đó"]
🤖 [Câu bot lượt 2]

👤 [Câu user lượt 3]
🤖 [Câu bot lượt 3]

**CHUẨN ĐỐI CHIẾU**
[Dữ kiện đúng theo nguồn chính thức + ngày tham chiếu]

**KẾT LUẬN**
[Giữ/mất ngữ cảnh? Chính xác không? Lệch gì?]

**GHI CHÚ DEV** (nếu có lỗi)
[Hướng fix: VD "Query rewriting/condensation gộp lịch sử trước khi retrieve"]
```

### B4. Tổng hợp phát hiện + điểm mạnh/điểm yếu + đề xuất test tiếp

```markdown
## B4. Tổng hợp phát hiện (xếp ưu tiên)

| Mức | Phát hiện | Khuyến nghị dev |
|-----|-----------|-----------------|
| CRITICAL | [lỗi chính xác nghiêm trọng: data sai/cũ] | [fix nguồn dữ liệu] |
| HIGH | [coreference đa lượt hỏng] | [query rewriting] |
| HIGH | [retrieval không nhất quán] | [hybrid search + synonyms] |
| MEDIUM | [data lỗi thời] | [cập nhật KB theo năm] |
| LOW | [mô tả lệch nhẹ] | [tinh chỉnh prompt/nguồn] |

**Điểm mạnh (đã xác nhận)**
✓ [độ chính xác dữ kiện tĩnh cao]
✓ [chống bịa đặt tốt]
✓ [giữ ngữ cảnh khi có từ khóa neo]
✓ [đa ngôn ngữ]

**Điểm yếu cốt lõi**
✗ [mất chủ thể khi tham chiếu bằng đại từ]
✗ [câu trả lời phụ thuộc cách diễn đạt]
✗ [dữ liệu mùa cũ chưa dọn]

**Đề xuất kiểm thử tiếp**
- Đánh giá định lượng RAGAS (faithfulness, relevancy, context precision/recall)
  trên 30–50 câu có đáp án chuẩn.
- Soi trace retrieval xem trả về chunk nào cho câu sai.
```

### Mapping 2 trục ↔ taxonomy 5 tầng

```
Trục A (hệ thống) dùng:
  T1 Unit · T2 Integration · T3 Functional · T4 UAT · T5 Doc Compliance

Trục B (AI accuracy) thêm 2 lớp chuyên biệt:
  B-ACCURACY  — đối chiếu ground truth (ĐÚNG/MỘT PHẦN/SAI/LỖI)
  B-ROBUST    — coreference đa lượt, nhất quán retrieval, chống bịa, đa ngôn ngữ

Mỗi bug card (A3) và mỗi kịch bản (B3) đều map về 1 test case TC-ID:
  Bug hệ thống:    TC-A-[NN]
  Kịch bản chatbot: TC-B-[X]
```

---

## REPORT FORMAT — docx đẹp (python-docx)

> **Bài học thực tế:** report docx từ pandoc mặc định RẤT KHÓ XEM (font nhạt, không hierarchy,
> bảng thô, ảnh quá to). Người đọc không nổi. Format BẮT BUỘC phải đẹp, chuyên nghiệp, scannable.
> Builder tham chiếu: `report-template/build_report_docx.py` (python-docx).

### Nguyên tắc excellence cho report docx

1. **Cover page** — băng màu header (navy) + tên sản phẩm lớn + đề tài + bảng thông tin + **score badge nổi bật**
   (số điểm lớn trong ô màu, kèm độ phủ + band verdict). Phải nhìn 1 cái là biết điểm几分.
2. **Color-coded score** — điểm/band màu theo ngưỡng: xanh ≥70, vàng 50-69, đỏ <50. Áp dụng cho badge,
   cell cấp rubric, band.
3. **Rubric table styled** — header navy trắng, cell "cấp" tô màu theo điểm, hàng total highlight, font gọn.
4. **Feature Inventory table** — gọn, header teal, trạng thái render màu.
5. **Chi tiết test theo tiêu chí (BẮT BUỘC)** — sau bảng điểm, mỗi tiêu chí C1-C7 = 1 card: header màu theo verdict (TC-ID + tên tiêu chí + [PASS/FAIL/UNVERIFIED]) + bảng 3 hàng (Kịch bản test / Expected / Actual) + ảnh proof embedded. Đây là phần thuyết phục nhất — người đọc thấy từng test, kết quả mong đợi vs thực tế, có ảnh. KHÔNG chỉ đưa điểm suông.
6. **Screenshot sized + captioned** — width ~4.6-6 inch (KHÔNG full-page khổng lồ), caption italic xám dưới ảnh.
7. **Typography chuyên nghiệp** — Calibri, hierarchy rõ (heading navy + đường kẻ teal), spacing nhất quán.
8. **Page footer** — "QA Report · [sản phẩm] · trang N" trên mỗi trang.
9. **Độ phủ + confidence hiển thị rõ** — không để điểm "đẹp" che việc chỉ test được 45%.

### Ưu tiên python-docx OVER pandoc cho report sản phẩm

- pandoc (markdown→docx): nhanh nhưng output THÔ, khó xem → CHỈ dùng cho report text đơn giản.
- **python-docx**: kiểm soát đầy đủ cover/badge/table màu/sizing → **BẮT BUỘC cho Software Product QA Report**.
- Builder `report-template/build_report_docx.py` đã implement sẵn: cover + score badge + rubric table
  color-coded + feature inventory + ảnh resize + footer. Dùng làm template, thay data.
- Ví dụ data test chi tiết theo tiêu chí: `report-template/sample_data.py` (mỗi tiêu chí =
  scenario/expected/actual/verdict/shots).

### Verify format đẹp (deterministic)

```bash
# 1. render ra PDF để mắt kiểm (libreoffice headless)
soffice --headless --convert-to pdf --outdir /tmp report.docx
# 2. verify cấu trúc: cover band + rubric table + ảnh embedded
python3 -c "from docx import Document; d=Document('report.docx'); print(len(d.tables),'tables', sum(1 for r in d.part.rels.values() if 'image' in r.reltype),'images')"
# 3. (optional) PDF→PNG rồi check visual
```

---

## REPORT MẪU EXCELLENCE (samples/) — đọc trước khi viết report

> Report mẫu đạt chuẩn excellence đi kèm skill. Mở ra, đọc cấu trúc, rồi bắt chước.
> Đây là "thước đo vàng" — report bạn viết phải đạt chất lượng tương đương.

| File | Sản phẩm mẫu | Điểm | Vì sao là mẫu tốt |
|------|--------------|------|--------------------|
| `samples/QA-Report-Sample.docx` | DemoKB (fictional) | cao 🟢 | Mẫu Excellence hoàn chỉnh: feature inventory, RBAC đa role, RAG AI grounded KB, rubric đầy đủ C1-C7, card test chi tiết, ảnh proof embedded, score badge navy. Đọc để thấy một report Excellence trông thế nào. |
| `samples/SUMMARY.md` | — | — | Cách tổng hợp nhiều report thành bảng xếp hạng + bảng điểm rubric. |

**Khi viết report mới:** mở `samples/QA-Report-Sample.docx` song song làm tham chiếu cấu trúc
(cover → score dashboard → A1 phương pháp → A2 bug summary → A3 bug cards → A4 passes → B1-B4 accuracy
→ rubric table → card test chi tiết C1-C7 → footer page number). Builder: `report-template/build_report_docx.py`.

---

## EXECUTION RECIPE — sinh report chất lượng cao end-to-end (reproducible)

> **Mục tiêu:** chạy test product → ra report đẹp + chính xác + có proof.
> Recipe này gộp toàn bộ: harness automation → rubric → docx đẹp. Script tham chiếu trong `harness/` + `report-template/`.

### Pipeline 6 bước (chạy theo thứ tự)

```
BƯỚC 0 — SETUP: install playwright+chromium+python-docx. Tạo screenshot folder ~/Downloads/...-[ts]/.
          Chuẩn bị cấu hình sản phẩm (url + creds các role + has_chatbot + topic).

BƯỚC 1 — HARNESS (harness/qa_harness.py, mỗi sản phẩm):
   → load (networkidle), login mỗi role FRESH CONTEXT, verify token+role-nav,
   → detect AI route (loại search box), probe 1 câu, screenshot mỗi bước.
   → Output: ev2.json + TC-A-*.png + TC-B-*.png

BƯỚC 2 — FEATURE EXPLORE (harness/feature_explore.py):
   → crawl nav theo từng role → Feature Inventory + screenshot mỗi feature.
   → Output: inv.json + TC-E-*.png  (KHÔNG kết luận "OK" khi còn feature UNTESTED)

BƯỚC 3 — AI PROBE (harness/ai_probe.py, sản phẩm có chatbot):
   → gửi câu domain + câu out-of-scope, capture bot bubble thật (không footer),
   → phát hiện greeting canned (cùng text 2 câu = scripted).
   → Output: aifacts.json + TC-B-3/4_*.png

BƯỚC 4 — BACKEND HEALTH (curl độc lập frontend):
   → curl /api, /health, /api/health. Xác định backend sống/chết deterministic.

BƯỚC 5 — RUBRIC SCORING (xem PRODUCT QA RUBRIC):
   → từ evidence (ev2/inv/aifacts/curl) gán level 1-5 mỗi tiêu chí C1-C7,
   → UNVERIFIED loại khỏi aggregate, recompute total bằng code.
   → Viết test_details: mỗi tiêu chí = scenario/expected/actual/verdict/shots.

BƯỚC 6 — DOCX ĐẸP (report-template/build_report_docx.py):
   → cover + score badge + rubric table color-coded + CHI TIẾT TEST THEO TIÊU CHÍ
     (card mỗi C: header verdict màu + bảng Kịch bản/Expected/Actual + ảnh proof)
   + feature inventory + ảnh resize+caption + footer page number.
   → verify: soffice→PDF→check visual + unzip|grep media.
```

### Quality gate trước khi giao report (checklist)

- [ ] Có Feature Inventory (≥1 feature) — không test hời hợt.
- [ ] Login verdict dựa trên token+role-nav (verify), không heuristic.
- [ ] AI test ở đúng route, ≥2 câu, capture bubble thật.
- [ ] Mỗi tiêu chí C1-C7 có card test chi tiết (scenario/expected/actual + ảnh proof).
- [ ] Bảng điểm rubric + aggregate recompute + coverage + confidence.
- [ ] Screenshot embedded (word/media), resize vừa, có caption.
- [ ] Cover score badge màu + footer page number.
- [ ] UNVERIFIED tách bạch FAIL; không chấm theo reputation.

→ Không qua được gate → KHÔNG giao report, làm lại bước thiếu.

---

## PRODUCT QA RUBRIC — chấm điểm sản phẩm

> **Nguyên tắc:** "Không có test thật + screenshot — không có điểm." Mỗi tiêu chí chấm PHẢI dựa trên
> test thực tế trong Feature Inventory + screenshot embedded. Không chấm theo cảm tính/reputation.
> Cơ chế rubric: tiêu chí chính/con → trọng số → 5 mức định tính → aggregate có trọng số →
> mỗi điểm có evidence (test case + screenshot) + confidence.

### Rubric sản phẩm phần mềm (/100, 7 tiêu chí chính)

| # | Tiêu chí chính | Trọng số | Tiêu chí con |
|---|----------------|----------|--------------|
| C1 | **Feature Discovery & Coverage** | 15% | C1.1 Feature inventory đầy đủ (số feature phát hiện vs số test); C1.2 Core feature hoạt động |
| C2 | **Auth & Access Control** | 15% | C2.1 Login đúng (verify token+role); C2.2 RBAC phân quyền theo role; C2.3 Bảo mật (không lộ token/secret trong DOM) |
| C3 | **Core Functionality** | 25% | C3.1 Main job end-to-end hoạt động; C3.2 CRUD/data flow đúng; C3.3 Error handling (không raw 500/SQL lộ) |
| C4 | **AI Quality** *(nếu có chatbot)* | 15% | C4.1 AI thật (không canned/scripted); C4.2 Accuracy grounded (đối chiếu); C4.3 Anti-hallucination (out-of-scope) |
| C5 | **Reliability & Production-readiness** | 15% | C5.1 Không crash/console error chặn luồng; C5.2 Backend health (curl endpoint); C5.3 Performance (load <5s) |
| C6 | **UX & Polish** | 10% | C6.1 Responsive (desktop+mobile); C6.2 Navigation rõ; C6.3 Hoàn thiện (không placeholder/TODO) |
| C7 | **Deploy & Testability** | 5% | C7.1 Đã deploy (URL sống); C7.2 Có account test cung cấp |

> Nếu product KHÔNG có chatbot → C4 trọng số 0%, phân bổ lại 15% cho C3(+10) và C5(+5).

### Mức định tính 1–5 (descriptor khách quan — dùng cho MỌI tiêu chí con)

| Level | Tên | Descriptor (phải khớp khách quan) |
|-------|-----|-----------------------------------|
| 5 | Excellent | Hoạt động đầy đủ, đúng spec, polish, có bằng chứng mạnh (test + screenshot) |
| 4 | Good | Hoạt động đúng, minor issue không chặn luồng |
| 3 | Fair | Hoạt động phần lớn, có bug workaround được |
| 2 | Weak | Bug chặn 1 luồng chính, hoặc thiếu feature cốt lõi |
| 1 | Poor | Crash / chặn luồng chính / feature hỏng hoàn toàn |
| 0 | N/A-UNVERIFIED | Không test được (gated/thiếu account/timeout) — **KHÔNG tính vào aggregate**, ghi rõ lý do |

### Công thức aggregate (tính lại bằng code, không LLM tính)

```
sub_score_i = (level_i / 5) × 100              # mỗi tiêu chí con
crit_score_Ck = Σ(sub_score_i × w_sub_i) / Σ(w_sub_i)   # trong 1 tiêu chí chính
TOTAL = Σ(crit_score_Ck × weight_Ck)            # weight_Ck = trọng số tiêu chí chính
```
- Tiêu chí con = 0 (UNVERIFIED) → loại khỏi aggregate, ghi note; nếu >50% UNVERIFIED → ghi rõ "điểm thấp confidence, cần account test".
- **Recompute**: tính TOTAL bằng script, không tin số LLM tự算.

### Bảng điểm trong report (BẮT BUỘC có — schema cập nhật)

```markdown
## Bảng điểm Rubric (Product QA · /100)

| Tiêu chí | Trọng số | Điểm (/100) | Đóng góp | Verdict | Test case | Screenshot |
|----------|----------|-------------|----------|---------|-----------|------------|
| C1 Feature Discovery | 15% | [x] | [x×0.15] | [5/3/1/UNV] | TC-E-* | TC-E-*.png |
| C2 Auth & RBAC | 15% | [x] | ... | ... | TC-A-02 | ... |
| C3 Core Functionality | 25% | [x] | ... | ... | TC-F-* | ... |
| C4 AI Quality | 15% | [x] | ... | ... | TC-B-* | ... |
| C5 Reliability | 15% | [x] | ... | ... | TC-A-01 | ... |
| C6 UX & Polish | 10% | [x] | ... | ... | TC-U-* | ... |
| C7 Deploy & Testability | 5% | [x] | ... | ... | — | ... |
| **TỔNG** | 100% | — | **[TOTAL]/100** | confidence: [0–1] | | |

Mỗi dòng: level (1-5) + rationale (1 câu dựa evidence) + screenshot embedded + confidence.
```

### Quy tắc chấm (anti-hallucination)

- **Mỗi điểm PHẢI có evidence**: test case ID + screenshot embedded + 1 câu rationale dựa kết quả test thật.
- **Không chấm theo reputation**: điểm cũ/prior reference → ghi [PRIOR REFERENCE], không dùng làm điểm hiện tại.
- **UNVERIFIED = 0 nhưng loại khỏi aggregate**: không = "kém". Ghi rõ lý do (gated/thiếu account).
- **Confidence**: cao (0.9+) khi mọi tiêu chí có test+screenshot; thấp (<0.6) khi >50% UNVERIFIED → ghi rõ.
- **Recompute aggregate** bằng script; LLM không tự算 tổng điểm.

### Tích hợp vào pipeline test

```
Sau FEATURE EXPLORE (Feature Inventory) →
  → Map mỗi feature trong inventory → tiêu chí rubric (C1-C7)
  → Test từng feature → ghi level 1-5 + screenshot + confidence
  → Recompute TOTAL
  → Viết report: Feature Inventory table + Bug cards + Bảng điểm Rubric + screenshot embedded
```

---

## LỚP VALIDATE & BẰNG CHỨNG (PROOF LAYER) — KHÔNG ĐƯỢC BỎ QUA

> **"Mỗi nhận định = bằng chứng. Không có bằng chứng = không có nhận định."**
> Lớp này chống lại lỗi nguy hiểm nhất của test tự động: **kết luận 'phần mềm lỗi' khi thực ra là
> test-runner bất lực hoặc đo sai.**

### Nguyên tắc gốc rễ

> **Phân biệt LỖI PHẦN MỀM vs HẠN CHẾ TEST-RUNNER.**
> Trước khi báo bất kỳ phát hiện tiêu cực nào, CHỨNG MINH nó là lỗi của phần mềm — không phải do
> harness không vào được trang / không có account / đo nhầm element / SPA chưa render.

### 5 nguyên tắc Proof

1. **Đa phương pháp độc lập (triangulation)** — mọi kết luận quan trọng (login OK/fail, feature works/broken, AI accurate) phải có **≥2 phương pháp đo độc lập**.
   - Login thành công → (a) token/cookie/localStorage được set **VÀ** (b) nội dung role-specific xuất hiện **VÀ** (c) route được bảo vệ trả 200. Một heuristic keyword là KHÔNG ĐỦ.
2. **PASS cần proof dương, FAIL cần proof âm về phần mềm**
   - PASS = bằng chứng tích cực (đích reached, output cụ thể match expected). KHÔNG phải "không thấy lỗi".
   - FAIL = chứng minh phần mềm (không phải harness) gây lỗi. Kịch bản tái hiện phải **đi tới trạng thái đúng** rồi mới quan sát lỗi.
3. **"Không test được" ≠ "Bị hỏng"** — ranh giới quan trọng nhất. Nếu test-runner không vào được / không có account / gated / SPA chưa render → ghi **UNVERIFIED**, KHÔNG BAO GIỜ ghi FAIL. Ghi rõ lý do (thiếu account, gated, timeout). Không suy ra tiêu cực từ việc harness bất lực.
4. **Self-check test-runner trước khi tin verdict** — trước khi kết luận feature X hỏng, xác nhận test-runner ĐÃ TỚI trạng thái cần test:
   - Test login? → verify session thực sự set (cookie/localStorage/token), KHÔNG chỉ dựa vào "không có error keyword" hay "URL không đổi" (SPA hay giữ URL).
   - Test chatbot/AI? → verify đang ở **đúng route AI** (/assistant, /chat), KHÔNG test nhầm ô search. Login xong rồi mới test.
   - Test feature sau login? → verify login thành công **TRƯỚC**, rồi mới test feature sau login.
   - SPA? → `wait_until=networkidle` + wait for specific selector, KHÔNG đo ngay sau domcontentloaded.
5. **Deterministic > heuristic** — ưa chuộng tín hiệu xác định (HTTP status, cookie/token presence, JSON field, **role-specific nav diff**, element existence) hơn heuristic (keyword matching nội dung body). Keyword matching body text = nguồn false positive/negative phổ biến.

### Quy trình Validate Gate (chạy TRƯỚC Phase 4 REPORT, cho mỗi claim)

```
Với MỖI nhận định định đưa vào báo cáo:
  [ ] Dựa trên bao nhiêu phương pháp đo? (≥2 cho claim quan trọng: auth/AI/core)
  [ ] Có bằng chứng cụ thể không? (screenshot + DOM/HTTP/console trace, số liệu)
  [ ] Nếu FAIL → test-runner đã tới đúng trạng thái chưa? (self-check login/state)
  [ ] Nếu FAIL → có thể là hạn chế test-runner? (gated/timeout/no-account/SPA-render)
        → NẾU CÓ → đổi thành UNVERIFIED + ghi lý do. KHÔNG ghi FAIL.
  [ ] Claim có số/liệt kê cụ thể? → đo bằng deterministic, không "có vẻ".
  [ ] Tái hiện được (reproducible)?
  Claim không qua gate → downgrade (FAIL→UNVERIFIED) hoặc bỏ / test thêm.
```

### Phân loại verdict (thay vì chỉ PASS/FAIL)

| Verdict | Ý nghĩa | Yêu cầu proof |
|---------|---------|---------------|
| **PASS** | Feature hoạt động | Proof dương (≥1 deterministic + screenshot) |
| **FAIL** | Phần mềm lỗi | Kịch bản tới đúng trạng thái + reproducible + proof |
| **UNVERIFIED** | Không test được (gated/no-account/timeout/harness limit) | Ghi rõ lý do — KHÔNG suy ra tiêu cực |
| **PARTIAL** | Một phần hoạt động | VD: login OK 3/4 role, 1 role fail |

### Bảng: đừng kết luận X, hãy kết luận Y

| Tình huống | ❌ Đừng kết luận | ✅ Hãy kết luận |
|---|---|---|
| Không có account test | "Login hỏng" | "UNVERIFIED — thiếu account" |
| Không có account trong sheet | "UNVERIFIED — thiếu account" | Quét on-page trước (Kỹ thuật 9.5): panel demo / hint credentials + button Demo/Showcase/Guest/Dùng thử + input prefilled + route `/demo`. Thử login từng nguồn → chỉ ghi UNVERIFIED khi đã quét + thử hết mà vẫn fail |
| SPA rỗng sau domcontentloaded | "White screen / app hỏng" | Verify lại với networkidle+selector wait; vẫn rỗng → FAIL có proof; render → PASS |
| Chatbot gated sau login, không login được | "AI-washing / chatbot giả" | "UNVERIFIED — chatbot gated sau login" |
| Ô "AI" thực ra là search box | "AI = search (cosmetic)" | Tìm đúng route AI thật (/assistant) rồi test — đo nhầm = kết luận sai |
| Cookie trống sau login (app dùng localStorage) | "Chưa login" | Check cả localStorage + role-specific content, không chỉ cookie |
| URL không đổi sau login (SPA) | "Login fail" | Check token store + role nav diff, không URL |
| Keyword "lỗi" trong body | "Có lỗi" | Xác định bằng console/network/deterministic |

### Case study điển hình (bài học thực)

> **Một sản phẩm SaaS đa role (ví dụ ẩn danh):** Test-runner kết luận "login chưa verify / fail" vì
> `after_url` vẫn ở root + cookie trống. THỰC TẾ: **các role đều login thành công** — SPA render dashboard
> theo role (nav khác nhau: admin có `/users` `/audit-logs`, editor có `/versions`, viewer chỉ đọc).
> Sai lầm: (1) tin "URL không đổi = login fail" (SPA giữ URL); (2) tin "cookie trống = chưa login"
> (app dùng localStorage, không cookie); (3) test AI **nhầm ô /search** thay vì `/assistant`.
> **Bài học: login thành công phải verify bằng role-specific content diff + token store, KHÔNG bằng
> URL/cookie heuristic. Element AI phải tìm đúng route — đo nhầm = kết luận sai → hạ uy tín toàn báo cáo.**

### Bằng chứng bắt buộc cho claim AI (Trục B)

Trước khi chấm AI ĐÚNG/SAI/HALLUCINATION:
- [ ] Đã ở đúng route chat/AI thật (không phải search/autocomplete).
- [ ] Capture **response text đầy đủ** của bot (không phải footer/dashboard text).
- [ ] Có nguồn đối chiếu (ground truth) cụ thể + ngày tham chiếu.
- [ ] Nếu bot không trả lời (timeout/empty) → **LỖI** (không phải "SAI") — phân biệt kỹ thuật vs accuracy.

---

## HARNESS PLAYBOOK — kỹ thuật test web-app thật

> Proof Layer (trên) = **nguyên tắc**. Phần này = **kỹ thuật cụ thể (how-to)** để nguyên tắc thành hiện thực.
> Mỗi kỹ năng sinh ra từ một lỗi THẬT khi test sản phẩm — không lý thuyết suông.

### Baseline thực tế (grounding cho các rule dưới)

> Test nhiều sản phẩm production. Kết quả khi áp dụng kỹ thuật đúng:
> - Nhiều sản phẩm thiếu account test trong spec → phải ghi UNVERIFIED, không FAIL.
> - Một số sản phẩm login FAIL thật (verify deterministic: stayed on login/auth, no token).
> - Một số sản phẩm login PASS khi verify đúng (token + role-nav diff).
> - Có sản phẩm bị chấm sai v1 ("login fail") → thực ra điểm cao (RBAC đa role + RAG thật) khi test đúng.
> - Có sản phẩm bị chấm sai v1 ("AI tốt") → thực ra thấp (trợ lý trả cùng greeting canned).
> → Bài học: **kỹ thuật harness sai = chấm sai cả sản phẩm.** Kỹ thuật dưới là bắt buộc.

### Kỹ thuật 1 — Fresh context per role (chống session bleed)

**Lỗi thật:** Test nhiều role (admin/editor/viewer) trong **cùng 1 browser context** → role đầu login OK,
các role sau "fail" vì **session role đầu còn persistent** → chỉ role đầu được verify. Sai lầm lớn.

**Đúng:** Mỗi role = **một context mới** (Playwright `br.new_context()` riêng), đảm bảo session cô lập.

```python
for cred in creds:
    ctx = br.new_context(...)        # FRESH — không chia sẻ cookie/localStorage
    pg = ctx.new_page()
    login(pg, cred); verify(pg)
    ctx.close()
```

### Kỹ thuật 2 — Login verification 3-method (KHÔNG heuristic)

**Lỗi thật:** tin "URL không đổi = login fail" (SPA giữ URL) và "cookie trống = chưa login" (app dùng localStorage). Cả hai đều sai → chấm fail nhầm.

**Đúng — 3 phương pháp độc lập, login PASS khi ≥2 khớp:**
1. **Token store** — check cookie + localStorage + sessionStorage có key auth/token/session mới (so BEFORE/AFTER submit).
2. **Role-specific nav diff** — sau login, nav menu thay đổi theo role (admin có `/audit-logs`, editor có `/versions`). `nav_after - nav_before ≠ ∅` → login thật.
3. **Screenshot** — dashboard role-specific render.

```python
before_nav = nav_set(pg); before_tok = token_state(ctx)
submit()
after_nav = nav_set(pg)
nav_new = after_nav - before_nav          # role-specific routes xuất hiện
tok_new = new auth keys                    # token store thay đổi
login_pass = bool(nav_new) or bool(tok_new)
```

### Kỹ thuật 3 — AI element detection: tìm ĐÚNG element, loại search box

**Lỗi thật:** Chỉ tìm `textarea` → bỏ lỡ chat input là `<input type=text>`. Lại test nhầm ô `/search` → kết luận sai "AI = search box".

**Đúng — thứ tự ưu tiên + loại trừ:**
1. `textarea`, `div[contenteditable=true]` (chat cổ điển).
2. **Fallback:** `input[type=text]`, `input:not([type])` — nhưng **lọc placeholder**:
   - LOẠI nếu placeholder chứa `tìm`/`search` (đó là search box).
   - CHỌN nếu placeholder chứa `câu hỏi`/`hỏi`/`nhắn`/`chat`/`trợ lý`/`ask`/`question`/`message`.

```python
for el in page.query_selector_all("input[type=text], input:not([type])"):
    ph = (el.get_attribute("placeholder") or "").lower()
    if any(s in ph for s in ["tìm","search"]): continue      # bỏ search box
    if any(s in ph for s in ["câu hỏi","hỏi","nhắn","chat","trợ lý","ask"]):
        chat_input = el; break
```

### Kỹ thuật 4 — Capture bot BUBBLE, không capture body

**Lỗi thật:** Capture `body[-500:]` → lấy text footer/dashboard/contact-info, không phải câu trả lời bot → chấm AI sai.

**Đúng:** Tìm **message bubble** gần nhất (element có text 25–1500 ký tự, không chứa câu hỏi gốc, không chứa "footer"), lấy bubble dài nhất hợp lý.

### Kỹ thuật 5 — Gửi câu hỏi domain, phân biệt greeting vs answer

**Lỗi thật:** Chỉ hỏi "Xin chào" → bot trả greeting → tưởng "AI tốt". Thực ra trợ lý trả **cùng greeting generic** cho mọi câu.

**Đúng:** Gửi ≥2 câu **khác nhau hoàn toàn** (1 câu domain factual + 1 câu out-of-scope). Nếu 2 câu trả về **cùng text** → AI canned/scripted (không phải generative). Out-of-scope → kiểm anti-bịa (có thừa nhận không biết không).

### Kỹ thuật 6 — Backend health probe ĐỘC LẬP với frontend (curl)

**Lỗi thật:** Frontend 200 nhưng báo "backend có vẻ chết" → sai. curl trực tiếp `/api`, `/health`, `/api/health` mới là deterministic.

**Đúng:** Test backend = `curl -o /dev/null -w "%{http_code}"` trên các endpoint health, **tách rời** frontend render. Frontend 200 + backend endpoint 200 = backend sống (deterministic, không heuristic).

```bash
for u in "$BASE/api/health" "$BASE/api" "$BASE/health"; do
  curl -s -o /dev/null -w "%{http_code} $u\n" --max-time 12 "$u"
done
```

### Kỹ thuật 7 — SPA render: networkidle + selector wait

**Lỗi thật:** Đo ngay sau `domcontentloaded` → body rỗng → vội kết luận "white-screen bug".

**Đúng:** `wait_until="networkidle"` + `wait_for_timeout(3500)` + wait specific selector. Nếu vẫn rỗng → **chưa đủ proof kết luận bug** (có thể auth-gate) → kiểm với login trước, hoặc ghi UNVERIFIED cần verify thủ công.

### Kỹ thuật 8 — Score discipline: "verified this run" vs "prior reference"

**Lỗi thật:** Dùng điểm từ lần trước (reputation) mà không re-verify → giữ điểm cao khi thực ra canned.

**Đúng:** Mỗi điểm phải ghi rõ nguồn:
- **[VERIFIED this run]** — có proof mới chạy lần này.
- **[PRIOR REFERENCE]** — giữ từ lần trước, KHÔNG re-verify được → ghi rõ "không re-verify, giữ tham chiếu", và **giảm trọng số** (không treat ngang verified).

Không bao giờ present prior-reference điểm như verified-current.

### Kỹ thuật 9 — Spec parsing: account có thể nằm trong ô Note multiline

**Lỗi thật:** Account test không có cột riêng — nằm lẫn trong ô "Note" multiline (cùng mô tả đề tài, ghi chú). Bỏ sót → tưởng "không có account".

**Đúng:** Parse spec → với mỗi sản phẩm, scan ô Note theo dòng, trích dòng có pattern `email | password` / `mã - mật khẩu (vai trò)` / dòng chứa `@` hoặc `pass`. Đừng chỉ đọc cột "account" (thường không tồn tại).

> Khi spec không có account → KHÔNG vội ghi UNVERIFIED. Chuyển sang **Kỹ thuật 9.5**: account có thể
> nằm ngay trên trang login hoặc có sẵn button Demo/Showcase mode.

### Kỹ thuật 9.5 — On-page credential discovery: demo/showcase mode (TRƯỚC khi ghi "thiếu account")

**Lỗi thật:** Spec không có account → vội ghi `UNVERIFIED — thiếu account`. NHƯNG rất nhiều sản phẩm
**hiển thị credentials ngay trên trang login** (panel "Demo accounts", hint "dùng admin/admin", ô "Tài khoản
mẫu"), hoặc có **button Demo / Showcase / Try-demo mode** tự login bằng account mẫu. Bỏ qua nguồn on-page
= báo "không test được" khi account ở ngay trước mắt → hạ uy tín báo cáo.

**NGUYÊN TẮC SỐNG CÒN:** Trước khi ghi `UNVERIFIED — thiếu account`, BẮT BUỘC quét trang login tìm
credentials on-page VÀ thử login bằng chúng. Account có thể ở 4 nguồn — thử ĐỦ trước khi từ bỏ:

**Nguồn 1 — Credentials hiển thị trên trang login (scan DOM text):**
Nhiều sản phẩm để sẵn ô "Demo accounts" / "Tài khoản test" / hint ngay form login. Quét:
- Body text có pattern credential: `email:password`, `tài khoản / mật khẩu`, `user — pass`, `admin/admin`,
  dòng chứa `@` kèm `:`/`—`/`/`, comment HTML `<!-- demo: ... -->`.
- Element gần form: `<code>`, `<pre>`, `<small>` hint, card/accordion "Tài khoản mẫu", modal "Demo accounts".
- Placeholder/aria-label input gợi ý `demo@… / demo123`.

```python
import re
text = page.inner_text("body")
creds = []
# Pattern: email kèm password sát nhau
for m in re.finditer(r"([\w.+-]+@[\w.-]+)\s*[:/|—\-]\s*([A-Za-z0-9_@!#$%]{4,})", text):
    creds.append((m.group(1), m.group(2)))
# Pattern kèm role: "Admin — admin@x / admin123"
for m in re.finditer(r"(admin|teacher|student|staff|editor|viewer|user|guest)[^\n]{0,40}?([\w.+-]+@[\w.-]+)\s*[:/|—\-]\s*(\S{4,})", text, re.I):
    creds.append((m.group(2), m.group(3), m.group(1)))   # (email, pass, role)
```

**Nguồn 2 — Button Demo / Showcase / Try-demo / Guest mode:**
Nhiều sản phẩm có nút **"Dùng thử" / "Demo" / "Showcase" / "Khám phá" / "Try" / "Guest login" / "Xem demo"**
→ click → app tự login bằng account mẫu (không cần gõ). Có thể mở modal chọn role.
- Tìm theo text button/link, click, rồi verify login bằng **Kỹ thuật 2** (token + role-nav diff).

```python
demo = page.query_selector(
    "button:has-text('Demo'), button:has-text('Showcase'), button:has-text('Dùng thử'), "
    "button:has-text('Khám phá'), a:has-text('Try'), button:has-text('Guest'), "
    "button:has-text('Xem demo'), :has-text('Tài khoản mẫu')")
if demo:
    demo.click()
    page.wait_for_load_state("networkidle")
    # chọn role trong modal nếu có → verify login (Kỹ thuật 2)
```

**Nguồn 3 — Form prefilled / autofill:**
Form login đôi khi đã prefilled (thuộc tính `value` của input có sẵn email/password). Đọc `input.value`
non-empty → submit trực tiếp, không cần gõ.

**Nguồn 4 — URL param / route demo:**
`?demo=1`, `/demo`, `/showcase`, `/preview`, `/guest` → vào luôn trạng thái đã login. Thử các route này.

**Quy trình thử login on-page (BẮT BUỘC trước khi ghi UNVERIFIED):**
1. Quét **cả 4 nguồn** trên trang login (DOM text + buttons + prefilled + URL route).
2. Với mỗi credential / button / route tìm được → thử login → verify bằng **Kỹ thuật 2** (token store + role-nav diff).
3. Login thành công bằng nguồn on-page → **tiếp tục test bình thường**, ghi note `account lấy từ on-page demo/showcase`.
4. **CHỈ khi đã quét đủ 4 nguồn VÀ thử login mà vẫn fail** → mới ghi
   `UNVERIFIED — thiếu account (đã quét on-page: không có demo/showcase mode, không prefilled)`.
5. **KHÔNG BAO GIỜ** ghi `UNVERIFIED — thiếu account` khi chưa quét on-page.

**Self-check trước khi ghi "thiếu account":**
- [ ] Đã scan DOM login page cho pattern email:password / role hint?
- [ ] Đã tìm + click button Demo/Showcase/Guest/Dùng thử/Xem demo?
- [ ] Đã check input prefilled (thuộc tính `value` non-empty)?
- [ ] Đã thử route `/demo`, `/showcase`, `?demo=1`?
- [ ] Với mỗi credential tìm được → đã thử login + verify token/role-nav (Kỹ thuật 2)?
→ Tick hết (đã thử hết) mà vẫn fail → mới `UNVERIFIED — thiếu account`.

### Kỹ thuật 10 — Screenshot EMBED vào report docx

**Yêu cầu:** Report docx phải có ảnh **embedded** (không chỉ reference), để người đọc thấy lỗi bằng mắt khi đọc.

**Đúng:** Viết markdown `![caption](/abs/path/screenshot.png)` → pandoc **embed** ảnh vào `word/media/` (verify: `unzip -l report.docx | grep media`). Cho report sản phẩm đẹp hơn, dùng `report-template/build_report_docx.py` (python-docx, kiểm soát đầy đủ cover/badge/table màu).

```bash
pandoc report.md -o report.docx --from=gfm
unzip -l report.docx | grep word/media   # verify ảnh embedded
```

### Harness self-test (chạy trước khi tin verdict batch)

Trước khi kết luận cả batch test, confirm harness KHÔNG có lỗi hệ thống:
- [ ] Mỗi role test trong context riêng (Kỹ thuật 1)?
- [ ] Login verdict dựa trên token+nav, không URL/cookie heuristic (Kỹ thuật 2)?
- [ ] AI input tìm đúng route, loại search (Kỹ thuật 3)?
- [ ] Bot response là bubble thật, không footer (Kỹ thuật 4)?
- [ ] Mỗi sản phẩm "thiếu account" đã quét on-page + thử Demo/Showcase mode trước khi ghi UNVERIFIED (Kỹ thuật 9.5)?
- [ ] Có ≥1 sản phẩm login PASS proof dương (nếu 0/0 → khả năng harness hỏng, không phải app hỏng)?

---

## Rules

| ID | Rule | Severity |
|----|------|----------|
| TS-01 | KHÔNG bao giờ test trên production data mà không hỏi user | CRITICAL |
| TS-02 | Mọi test phải chạy trong sandbox/môi trường độc lập | CRITICAL |
| TS-03 | Cleanup sau khi test xong — không để lại rác (NHƯNG giữ screenshot folder) | HIGH |
| TS-04 | Thao tác nguy hiểm (xóa, ghi đè, gửi thật) → hỏi user trước | CRITICAL |
| TS-05 | Mọi test case phải có expected output cụ thể trước khi chạy | HIGH |
| TS-06 | Report phải có: pass rate, chi tiết failure, đề xuất fix | HIGH |
| TS-07 | Fail-fast: nếu tầng thấp fail >50% → dừng, báo user | MEDIUM |
| TS-08 | Đọc HDSD khi có — test theo đúng hướng dẫn | HIGH |
| TS-09 | Chụp window-specific (KHÔNG fullscreen) khi test UI hoặc chế độ screenshot bật | MEDIUM |
| TS-10 | Verify cleanup hoàn tất trước khi kết thúc | HIGH |
| TS-11 | LUÔN hỏi user chọn headless hoặc screenshot trước khi chạy test | CRITICAL |
| TS-12 | Screenshot folder phải đặt tại ~/Downloads/ hoặc current dir — KHÔNG đặt trong /tmp/ | HIGH |
| TS-13 | KHÔNG xóa screenshot folder sau khi test — đây là artifact của user | CRITICAL |
| TS-14 | Tên screenshot theo pattern [TC-ID]_step[N]_[mo-ta].png để dễ tìm kiếm sau này | HIGH |
| TS-15 | Screenshot PHẢI dùng window-specific capture (screencapture -l), KHÔNG fullscreen | CRITICAL |
| TS-16 | Notebook screenshot phải execute trước (jupyter nbconvert --execute) rồi scroll tới output cuối | HIGH |
| TS-17 | Khi test SẢN PHẨM PHẦN MỀM hoàn chỉnh → dùng schema "Software Product QA Report" (2 trục), không dùng test case đơn lẻ | HIGH |
| TS-18 | Sản phẩm có AI/RAG/chatbot → BẮT BUỘC chạy Trục B (độ chính xác): kịch bản đa lượt + đối chiếu ground truth, không chỉ test UI | CRITICAL |
| TS-19 | Mỗi bug card (A3) phải đủ 5 trường: HIỆN TƯỢNG · KỊCH BẢN TÁI HIỆN · NGUYÊN NHÂN GỐC · GHI CHÚ DEV · ẢNH CHỨNG CỨ | HIGH |
| TS-20 | **Triangulation**: claim quan trọng (auth/AI/core) phải có ≥2 phương pháp đo độc lập, không tin 1 heuristic | CRITICAL |
| TS-21 | **"Không test được" ≠ "Bị hỏng"**: gated/no-account/timeout/SPA-render → ghi UNVERIFIED, KHÔNG bao giờ ghi FAIL | CRITICAL |
| TS-22 | **Self-check test-runner**: trước khi kết luận feature hỏng, chứng minh harness đã tới đúng trạng thái (login verified bằng token/role-content; AI ở đúng route không nhầm search) | CRITICAL |
| TS-23 | **Login thành công** phải verify bằng (a) token store (cookie/localStorage) VÀ (b) role-specific content/nav diff — KHÔNG bằng URL heuristic hay "không có error keyword" | CRITICAL |
| TS-24 | **Validate Gate bắt buộc** trước REPORT: mỗi claim qua checklist proof; FAIL không qua gate → downgrade UNVERIFIED hoặc test thêm | HIGH |
| TS-25 | **Deterministic > heuristic**: ưu tiên HTTP status / element existence / JSON field / role-nav-diff; hạn chế keyword-matching body text | HIGH |
| TS-26 | **Mỗi bug card phải có ảnh chụp thực của lỗi đó** (screenshot embedded) — không chỉ mô tả "xem trace" | HIGH |
| TS-27 | **Fresh context per role**: test nhiều role phải dùng browser context riêng mỗi role (chống session bleed làm role sau "fail" giả) | CRITICAL |
| TS-28 | **AI element phải là input chat thật**: tìm textarea + input[type=text] có placeholder chat, LOẠI search box (placeholder "tìm"/"search"); KHÔNG kết luận "AI = search" nếu chưa vào đúng route AI | CRITICAL |
| TS-29 | **Backend health probe độc lập**: verify backend bằng curl trực tiếp các endpoint health, tách rời frontend render (KHÔNG suy ra "backend chết" từ frontend heuristic) | HIGH |
| TS-30 | **Score discipline**: mỗi điểm phải ghi [VERIFIED this run] hoặc [PRIOR REFERENCE] — không present điểm cũ như verified-current; AI verdict cần ≥2 câu hỏi khác nhau (phân biệt greeting canned vs generative) | HIGH |
| TS-31 | **Screenshot embedded trong report docx** (pandoc `![]()` → word/media) — report web-app QA phải có ảnh thật bên trong, verify bằng `unzip -l \| grep media` | HIGH |
| TS-32 | **Feature Explore bắt buộc**: test sản phẩm phải crawl nav/routes theo từng role → lập Feature Inventory → test từng feature; KHÔNG kết luận "product OK" khi còn feature UNTESTED trong inventory | CRITICAL |
| TS-33 | **Rubric scoring bắt buộc**: report sản phẩm phải có Bảng điểm Rubric (C1-C7, trọng số, level 1-5, aggregate recompute) — không chỉ PASS/FAIL định tính | CRITICAL |
| TS-34 | **Mỗi điểm rubric phải có evidence**: test case ID + screenshot embedded + rationale dựa test thật; UNVERIFIED loại khỏi aggregate (không = kém); không chấm theo reputation (TS-30) | HIGH |
| TS-35 | **Confidence trung thực**: báo confidence thấp (<0.6) khi >50% tiêu chí UNVERIFIED (thiếu account/gated) — không present điểm như verified khi thực ra không test được | HIGH |
| TS-36 | **Polish report**: mọi report docx cuối cùng nên qua một bước trau chuốt văn phong & trình bày chuyên nghiệp TRƯỚC khi giao cho user — bước này KHÔNG đổi nội dung/điểm số, chỉ format + văn phong | HIGH |
| TS-37 | **Report format đẹp (python-docx)**: Software Product QA Report BẮT BUỘC build bằng python-docx (cover + score badge màu + rubric table color-coded + ảnh resize+caption + footer) — KHÔNG dùng pandoc mặc định (output thô, khó xem). Builder template: `report-template/build_report_docx.py` | CRITICAL |
| TS-38 | **Chi tiết test theo tiêu chí (BẮT BUỘC)**: report phải có phần mỗi tiêu chí C1-C7 = 1 card với Kịch bản test + Expected + Actual + verdict + ảnh proof embedded. Điểm số một mình KHÔNG đủ — phải có test cụ thể, kết quả mong đợi vs thực tế, có bằng chứng ảnh | CRITICAL |
| TS-39 | **EXECUTION RECIPE + harness scripts**: test product phải theo pipeline 6 bước (harness/qa_harness → feature_explore → ai_probe → curl → rubric → build_report_docx) + qua Quality gate trước khi giao. Script tham chiếu trong `harness/` + `report-template/` — đảm bảo chất lượng reproducible | HIGH |
| TS-40 | **On-page credential discovery bắt buộc**: KHÔNG được ghi `UNVERIFIED — thiếu account` khi chưa quét trang login tìm 4 nguồn on-page (Kỹ thuật 9.5): (1) credentials hiển thị trong DOM/panel demo/hint, (2) button Demo/Showcase/Try/Guest/Dùng thử mode, (3) form prefilled, (4) route `/demo` `/showcase` `?demo=1`. Với mỗi nguồn tìm được → phải thử login + verify bằng token/role-nav (Kỹ thuật 2). Chỉ ghi "thiếu account" khi đã quét + thử hết mà vẫn fail | CRITICAL |

---

## Anti-patterns — Không làm

```
❌ Test trên production mà không hỏi → có thể phá hủy dữ liệu thật
❌ Không tạo sandbox → test ảnh hưởng hệ thống chính
❌ Không cleanup → để lại file tạm, data rác, process mồ côi
❌ Chỉ test happy path → bỏ qua edge case, error case
❌ Expected output mơ hồ ("khoảng đúng", "có vẻ ổn") → phải cụ thể
❌ Tự động chạy thao tác nguy hiểm → phải hỏi user
❌ Skip tầng test vì "có vẻ ổn" → test đầy đủ hoặc có lý do skip
❌ Report chỉ nói "pass" không nói chi tiết → user cần biết test cái gì
❌ Không đọc HDSD khi có sẵn → bỏ lỡ kịch bản test quan trọng
❌ Chạy test phụ thuộc lẫn nhau song song → kết quả không đáng tin
❌ Báo PASS khi actual output khác expected → trung thực tuyệt đối
❌ Chạy test mà không hỏi chế độ headless/screenshot → PHẢI hỏi trước
❌ Đặt screenshot folder trong /tmp/ → OS sẽ xóa tự động, mất artifact
❌ Xóa screenshot folder sau khi test xong → user cần screenshot làm bằng chứng
❌ Chụp fullscreen → bị lẫn windows khác, lộ PII/sensitive info từ app đang chạy
❌ Chụp notebook mà không execute trước → chỉ thấy code, không thấy output
❌ Dùng Page Down để scroll notebook trong VS Code → không hoạt động, phải dùng CGEvent scroll wheel
❌ Báo "login fail" chỉ vì URL không đổi / cookie trống — SPA giữ URL, app có thể dùng localStorage → phải verify bằng token store + role-specific content
❌ Báo "white-screen / app hỏng" khi mới đo sau domcontentloaded → SPA cần networkidle + wait selector
❌ Báo "AI-washing / chatbot giả" khi không login được vào gated chat → đó là UNVERIFIED, không phải FAIL
❌ Test nhầm ô search rồi kết luận "AI chỉ là search" → phải tìm đúng route AI (/assistant) rồi test
❌ Đoạn "không có account" rồi suy ra "login hỏng" → đó là hạn chế test-runner, ghi UNVERIFIED
❌ Ghi `UNVERIFIED — thiếu account` khi chưa quét on-page (Kỹ thuật 9.5) → account có thể nằm ngay UI login (panel demo / hint) hoặc có button Demo/Showcase/Guest mode → phải quét 4 nguồn + thử login trước khi từ bỏ
❌ Keyword-matching body text ("thấy chữ 'lỗi' → có lỗi") → phải deterministic (console/network/status)
❌ Báo cáo nhận định KHÔNG qua Validate Gate → mỗi claim cần proof + self-check harness
❌ FAIL mà không tái hiện được / không chứng minh harness tới đúng trạng thái → downgrade UNVERIFIED
❌ Test nhiều role trong cùng 1 browser context → session bleed, role sau "fail" giả (phải fresh context per role)
❌ Tìm AI input chỉ theo textarea → bỏ lỡ input[type=text]; lại test nhầm ô search rồi kết luận "AI = search"
❌ Capture body[-N:] làm "phản hồi bot" → lấy footer/dashboard, chấm AI sai → phải capture message bubble thật
❌ Hỏi 1 câu "xin chào" rồi chấm AI "tốt" → phải ≥2 câu khác nhau, phát hiện greeting canned
❌ Suy ra "backend chết" từ frontend render → phải curl endpoint health độc lập
❌ Đo SPA ngay sau domcontentloaded rồi kết luận "white-screen" → networkidle + selector wait; chưa đủ proof → UNVERIFIED
❌ Present điểm cũ (prior reference) như verified-current → phải ghi rõ nguồn, giảm trọng số nếu không re-verify
❌ Report docx chỉ mô tả "xem trace" không có ảnh embedded → pandoc embed screenshot vào word/media
```

---

*Living skill. Update sau mỗi testing session.*
*"Không tin lời nói — chỉ tin kết quả test."*
