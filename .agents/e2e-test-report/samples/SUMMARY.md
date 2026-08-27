# Cách tổng hợp nhiều report thành bảng xếp hạng

> Khi bạn test **nhiều sản phẩm** (ví dụ một lô sản phẩm vibe coding cần đánh giá), mỗi sản phẩm ra
> 1 file `QA-Report-<Tên>.docx`. File này hướng dẫn tổng hợp các report đơn lẻ thành **1 bảng xếp hạng**
> để so sánh nhanh — kèm độ phủ + độ tin cậy để không hiểu lầm "điểm cao = sản phẩm hoàn chỉnh".

## Bảng xếp hạng theo Rubric (/100, tính lại bằng công thức)

| Hạng | Sản phẩm | Loại | Điểm | Độ phủ | Độ tin cậy | Band |
|------|----------|------|------|--------|-----------|------|
| 1 | **DemoKB** | Kho tri thức + RAG | **92.0** | 100% | 0.92 | 🟢 Sản phẩm tốt |
| 2 | *(sản phẩm tiếp theo)* | … | … | … | … | … |

> Cách tính: mở mỗi `QA-Report-<Tên>.docx` → lấy điểm tổng + độ phủ + confidence từ trang cover/rubric.
> Nhập vào bảng, sắp xếp giảm dần. Recompute aggregate bằng code (xem `build_report_docx.py` → `aggregate()`),
> KHÔNG tự tính nhẩm.

## Ý nghĩa các cột

- **Điểm** = tổng rubric /100 (C1-C7 có trọng số), chỉ tính trên phần kiểm tra được.
- **Độ phủ** = % tiêu chí đã kiểm tra được. Độ phủ thấp → điểm chỉ phản ánh một phần sản phẩm.
- **Độ tin cậy (confidence)**: 0.92 khi gần như mọi tiêu chí có test+screenshot; 0.55–0.75 khi nhiều UNVERIFIED.
- **Band**: 🟢 ≥85 xuất sắc · 🟡 70-84 khá · 🟠 50-69 trung bình · 🔴 <50 yếu · ⚠ độ phủ thấp.

## Band → hành động (template coaching)

| Band | Hành động gợi ý |
|------|-----------------|
| 🔴 Yếu | Fix lỗi chặn luồng chính (login vỡ, SPA rỗng, backend chết) trước khi làm gì khác |
| 🟠 Trung bình | Cung cấp account test ổn định, fix lỗi HI/CRIT trong bug cards |
| ⚠ Phủ thấp | Cung cấp account / mở demo mode để re-verify các tiêu chí UNVERIFIED |
| 🟡 Khá | Wire tính năng AI thật (nếu đang canned/search), dọn placeholder, polish UX |
| 🟢 Tốt | Giữ chất lượng, verify các tiêu chí chưa re-test, polish nhỏ |

## 4 phát hiện thường gặp khi tổng hợp (bài học thực tế)

1. **Feature Explore lột trần chất lượng thật:** sản phẩm liệt kê được nhiều feature + test hết thường
   dẫn đầu; sản phẩm không vào được dashboard (login vỡ / SPA rỗng) xếp cuối — bảng điểm phản ánh đúng
   hơn là chỉ nhìn homepage.
2. **Account test là nút thắt:** nhiều sản phẩm gated sau login → độ phủ thấp → confidence thấp. Yêu cầu
   account ổn định (hoặc demo/showcase mode) cho mỗi lần test.
3. **Login FAIL phải verify deterministic:** URL không đổi (SPA) hoặc cookie trống (app dùng localStorage)
   KHÔNG đủ kết luận fail — phải check token store + role-nav diff.
4. **AI-washing chấm chuẩn:** RAG thật (grounded, anti-bịa) ≠ greeting canned (cùng text nhiều câu) ≠
   search box giả AI. Test ≥2 câu khác nhau ở đúng route AI.

---

*Mẫu: `QA-Report-Sample.docx` (DemoKB) là ví dụ 1 report đơn lẻ đạt band 🟢. Mở ra để thấy cấu trúc
một report Excellence trước khi tổng hợp.*
