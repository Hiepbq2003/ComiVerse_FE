# ComiVerse

🌍 **Live Demo:** [https://comi-verse.vercel.app/](https://comi-verse.vercel.app/)

![ComiVerse Hero](./src/assets/comic_action.png)

**ComiVerse** is a modern, premium comic and manga reading platform featuring dynamic workflows for readers, independent authors, crowdsourced translation teams, and content moderators. Built with high aesthetic standards (glassmorphism, modern typography, fluid animations), it bridges the gap between content creators and international audiences through its built-in translation and moderation hubs.

---

## 🌟 Key Features by Role

### 📖 Reader (Public)
- **Immersive Reading Experience**: Smart-scroll behavior, intuitive page navigation, and immersive full-screen reading without UI distractions.
- **Preloading & Performance**: Advanced image preloading for zero-latency page flips.
- **Community Engagement**: Integrated forum discussions, chapter comments, 5-star rating systems, and personalized libraries/reading history.

### ✍️ Author
- **Creator Studio**: Upload comics, manage chapter releases, and configure publication status (Ongoing, Completed, Hiatus).
- **Monetization & Analytics**: Track chapter views, reader retention, and estimated revenue. 
- **Premium Content**: Lock specific chapters for premium access, driving direct revenue.

### 🌐 Translator & Project Leader
- **Translation Hub**: Kanban-style task breakdown for translation projects (To Do, In Progress, Review Queue).
- **Split-Screen Workspace**: Side-by-side original and translated content view for seamless workflow.
- **Payout Ledger**: Track page-by-page earnings and settlement reports directly from the dashboard.

### 🛡️ Moderator
- **Content Review Queue**: Streamlined interface for inspecting reported chapters, checking for copyright violations, or reviewing flagged chat messages.
- **Takedown & Strikes**: Issue warnings, mute users, or process DMCA takedown requests with automated notifications.

### ⚙️ Administrator
- **System Command**: Oversee the entire platform’s health via comprehensive statistics dashboards.
- **Revenue & Payouts**: Review and approve withdrawal requests from authors and translators via Stripe integration.
- **Account & Broadcast**: Manage global broadcasts, user bans, and role assignments.

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
