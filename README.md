# ComiVerse

🌍 **Live Demo:** [https://comi-verse.vercel.app/](https://comi-verse.vercel.app/)

![ComiVerse Hero](./src/assets/comic_action.png)

**ComiVerse** is a modern, premium comic and manga reading platform featuring dynamic workflows for readers, independent authors, crowdsourced translation teams, and content moderators. Built with high aesthetic standards (glassmorphism, modern typography, fluid animations), it bridges the gap between content creators and international audiences through its built-in translation and moderation hubs.

---

## 🌟 Main Workflows & Features by Role

### 📖 1. Reader (Public User)
**Luồng chính (Main Workflow):** Khám phá truyện -> Đọc truyện -> Tương tác -> Mua Premium.
- **Immersive Reading Experience**: Cung cấp chế độ đọc Full-screen, tự động ẩn thanh điều hướng (Smart-scroll) để tối đa hoá diện tích hiển thị truyện. Hỗ trợ thay đổi giao diện (Dark/Light) và bố cục (Vertical/Single page).
- **Zero-Latency Preloading**: Ảnh của 3 trang tiếp theo luôn được tải ngầm (preload) giúp người dùng chuyển trang mượt mà không bao giờ gặp hiệu ứng tải (loading spinner).
- **Personalized Library & Reading History**: Tự động lưu lịch sử đọc theo từng chương, từng trang. Hệ thống Bookmark và "Save" giúp quản lý kho truyện cá nhân.
- **Community & Social Interaction**: Hệ thống Forum thảo luận theo chủ đề, Comment realtime từng chương truyện, và hệ thống đánh giá 5 sao có ảnh hưởng đến bảng xếp hạng thuật toán của ComiVerse.
- **Premium Purchases**: Mở khoá các chương tính phí trực tiếp bằng số dư ví.

### ✍️ 2. Author (Content Creator)
**Luồng chính (Main Workflow):** Sáng tác/Upload -> Kiểm duyệt -> Xuất bản -> Nhận doanh thu.
- **Creator Studio Dashboard**: Không gian làm việc riêng biệt. Theo dõi biểu đồ doanh thu, lượt view, lượt follow theo thời gian thực (tích hợp Recharts).
- **Comic & Chapter Management**: Upload hàng loạt ảnh truyện, hỗ trợ tính năng tự động sắp xếp theo tên file. Có thể cài đặt chương truyện là miễn phí (Free) hoặc trả phí (Premium).
- **Publication Workflow**: Thiết lập trạng thái truyện (Ongoing, Completed, Hiatus). Quản lý yêu cầu cấp phép bản quyền cho từng bộ truyện.
- **Monetization & Payouts**: Hệ thống tự động tính toán doanh thu (Ledger) dựa trên lượt đọc (View-unit rate) và lượt mua. Author có thể rút tiền (Payout) trực tiếp về tài khoản ngân hàng thông qua tích hợp **Stripe Connect**.

### 🌐 3. Translator & Project Leader (Localization Team)
**Luồng chính (Main Workflow):** Nhận project -> Phân chia Task -> Dịch & Review -> Xuất bản bản dịch -> Nhận tiền theo số trang.
- **Kanban Task Breakdown**: Project Leader nhận các dự án dịch, sau đó giao việc cho thành viên dưới dạng các Task thẻ Kanban (To Do -> In Progress -> Review Queue -> Completed).
- **Split-Screen Translation Workspace**: Không gian dịch thuật chia đôi màn hình: Trái là bản gốc (Raw), Phải là công cụ nhập text cho bản dịch, giúp Translator làm việc trực tiếp trên nền tảng mà không cần phần mềm bên thứ 3.
- **Approval & Quality Control**: Project Leader duyệt (Approve) hoặc từ chối (Reject) bản dịch của nhân viên với tính năng để lại feedback trực tiếp.
- **Translator Payout Ledger**: Hệ thống tự động tính tiền công cho Translator dựa trên **số lượng trang đã dịch hoàn tất**. Cấu hình mức giá cố định (vd: 3.50$/trang) và giới hạn rút tiền hàng tháng.

### 🛡️ 4. Moderator (Content & Community Police)
**Luồng chính (Main Workflow):** Nhận ticket Report -> Điều tra bằng chứng -> Đưa ra hình phạt.
- **Content Review Queue**: Hệ thống tự động phân phối các báo cáo (Report) từ người dùng (Vd: Bạo lực, Bản quyền, Spam). Moderator sẽ kiểm duyệt nội dung của Author hoặc Translator.
- **Split-Screen Inspection**: Tính năng đặc biệt cho phép Moderator so sánh trực tiếp nội dung bị report (bản dịch) và bản gốc để bắt lỗi vi phạm hoặc dịch sai.
- **Takedown & Account Strikes**: Áp dụng hệ thống Cảnh cáo (Strikes). Ban/Mute tài khoản vi phạm, hoặc gỡ bỏ toàn bộ chương truyện (DMCA Takedown) kèm theo hệ thống gửi email cảnh báo tự động.

### ⚙️ 5. Administrator (Super User)
**Luồng chính (Main Workflow):** Giám sát toàn hệ thống -> Cấu hình tham số -> Phê duyệt dòng tiền.
- **System Command Dashboard**: Thống kê toàn cảnh về sự tăng trưởng người dùng, doanh thu nền tảng, và tình trạng server.
- **Financial & Payout Approvals**: Quản lý toàn bộ yêu cầu rút tiền của Creator và Translator. Admin có quyền Approval cuối cùng trước khi gọi API Stripe để chuyển tiền thật.
- **Global Configuration**: Cấu hình tỷ lệ chia sẻ doanh thu (Revenue split), giá tiền cho mỗi lượt view, và cấu hình thông báo toàn hệ thống (Global Broadcasts).

---

## 💻 Tech Stack

### Frontend (This Repository)
- **Framework**: React 19 + Vite
- **Routing**: React Router DOM v7
- **Styling**: Pure CSS (BEM architecture) focusing on custom variables, fluid CSS gradients, and glassmorphism. No Tailwind/Bootstrap dependencies to ensure 100% custom identity.
- **API Client**: Axios with global interceptors.
- **Notifications**: React Toastify.

### Backend (Java API)
- **Framework**: Spring Boot (Java 17+)
- **Database**: PostgreSQL (with Vector search indexing)
- **Storage**: Cloudinary (Image & Chapter assets)
- **Security**: Spring Security & JWT (Role-based access controls)
- **Integrations**: Resend (Emails), Stripe (Payouts)

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Hiepbq2003/ComiVerse_FE.git
   cd ComiVerse_FE
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5173`.

---

## 🔑 Test Accounts (Seed Data)

The backend provides pre-seeded accounts for local testing of all role-specific workspaces. You can log in using the following credentials:

| Role | Username | Password | Email |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | admin@comiverse.com |
| **Moderator** | `moderator1` | `staff123` | moderator1@comiverse.com |
| **Author** | `author1` | `staff123` | author1@comiverse.com |
| **Translator** | `translator1` | `staff123` | translator1@comiverse.com |
| **Project Leader**| `projectleader1`| `staff123` | projectleader1@comiverse.com |
| **Reader** | `reader1` | `reader123` | reader1@comiverse.com |

---

## 🎨 UI/UX Philosophy

ComiVerse strictly adheres to a **Premium Dark Theme** by default (`#0d0919` backgrounds with vibrant purple/orange gradients). Components feature liquid motion effects, shimmer skeleton loaders for data fetching to prevent layout shifts, and specialized CSS architectures to maintain modularity across different role dashboards.

---

*ComiVerse — Connecting stories across borders.*
