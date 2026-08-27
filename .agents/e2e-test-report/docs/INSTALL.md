# Cài đặt — e2e-test-report

## Yêu cầu

- Một agent coding client hỗ trợ SKILL.md: **Claude Code**, **Codex CLI**, hoặc **Antigravity**
  (xem README.md ở gốc repo để biết client nào dùng thư mục nào)
- Python 3.10+ (cho harness automation + report builder)
- Python packages (cho report excellence + harness web-app):
  ```bash
  pip3 install --break-system-packages python-docx playwright
  python3 -m playwright install chromium
  ```
- LibreOffice (`soffice`) — chỉ cần khi verify/đổi report ra PDF (optional)

## Cài đặt

### Claude Code (khuyến nghị)

```bash
git clone https://github.com/hailoc12/e2e_test_report_for_vibe_coding.git
cd e2e_test_report_for_vibe_coding
```

**Option 1 — Personal (áp dụng mọi project):**
```bash
cp -R e2e-test-report ~/.claude/skills/
```

**Option 2 — Project-only (chỉ project hiện tại):**
```bash
cp -R e2e-test-report .claude/skills/
```

Khởi động lại Claude Code, rồi gọi:
```
/e2e-test-report
```

### Codex CLI

Codex đọc prompt/skill theo cấu hình `instructions` + `mcp_servers` trong `~/.codex/config.toml`.
Cách đơn giản nhất: trỏ `instructions` vào thư mục skill, hoặc copy nội dung `SKILL.md` vào
prompt hệ thống của Codex (AGENTS.md / `~/.codex/AGENTS.md`). Sau đó gọi skill bằng mô tả:
```
Dùng skill e2e-test-report để test <target>
```

### Antigravity

Antigravity IDE đọc SKILL.md như các agent client tương thích. Đặt thư mục skill vào vị trí
Antigravity quét (thường `~/.antigravity/skills/` hoặc workspace `.skills/`), restart IDE, rồi invoke.

> Antigravity là Electron app — skill dùng Quartz API để chụp window-specific screenshot (xem
> section "Screenshot Mode" trong SKILL.md).

## Xác nhận cài đặt

Gọi skill không argument để xem hướng dẫn, hoặc truyền target:
```
/e2e-test-report https://your-app.example.com
```

## Gỡ cài đặt
```bash
rm -rf ~/.claude/skills/e2e-test-report
```
