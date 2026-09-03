<div align="center">

# 🌌 ComiVerse

### *Connecting stories across borders*

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-comi--verse.vercel.app-blueviolet?style=for-the-badge)](https://comi-verse.vercel.app/)
[![Backend API](https://img.shields.io/badge/⚙️_Backend_API-Railway-0B0D17?style=for-the-badge&logo=railway&logoColor=white)](https://github.com/Hanh246/SEP490_G37_SUM26_JAVA)

![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000?style=flat-square&logo=vercel&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D17?style=flat-square&logo=railway&logoColor=white)

<br/>

<img src="./src/assets/comic_action.png" alt="ComiVerse Hero" width="720" />

<br/>

**A full-stack comic & manga platform** with multi-role workflows for readers, creators, translation teams, moderators and admins. Built with premium dark-mode glassmorphism UI and production-grade architecture.

</div>

---

## 📊 Project Scale

<div align="center">

| Metric | Count |
|:------:|:-----:|
| **Pages** | 65 |
| **Components** | 56 |
| **API Services** | 33 |
| **Test Suites** | 75 |
| **CSS Modules** | 60 |
| **Custom Hooks** | 4 |

</div>

---

## ✨ Key Features & Workflows

### 📖 Reader
> Explore → Read → Engage → Subscribe

- **Immersive reading** — full-screen mode, auto-hide headers, dark/light themes, vertical/single-page layouts
- **Zero-latency preloading** — next 3 pages silently loaded in background
- **Smart library** — auto-tracks reading progress to exact page, bookmarks, save-for-later
- **Community** — forums, chapter comments, 5-star ratings with ranking integration
- **Premium subscriptions** — unlock premium chapters via Stripe-powered wallet

---

### ✍️ Author / Creator
> Upload → Configure → Publish → Earn

- **Creator Studio** — real-time dashboard (views, revenue, followers) with Recharts
- **Bulk upload** — drag-and-drop chapter images, auto-sorted by filename
- **Publication control** — Free/Premium chapters, series status (Ongoing/Completed/Hiatus)
- **Monetization** — automated ledger (view-unit rate + premium purchases), Stripe Connect payouts

---

### 🌐 Translation Team
> Receive Project → Delegate → Translate → Review → Publish

- **Kanban board** — task breakdown with To Do → In Progress → Review → Completed pipeline
- **Split-screen workspace** — original content (left) vs. translation input (right), no external tools needed
- **Quality control** — approve/reject with contextual feedback
- **Page-based payouts** — auto-calculated compensation per translated page

---

### 🛡️ Moderator
> Receive Reports → Investigate → Enforce

- **Review queue** — auto-distributed reports (violence, copyright, spam)
- **Split-screen inspection** — compare original vs. translated content side-by-side
- **Enforcement tools** — account strikes, mute/ban, DMCA takedowns with automated email warnings

---

### ⚙️ Administrator
> Monitor → Configure → Approve

- **System dashboard** — user growth, platform revenue, server health metrics
- **Financial approvals** — final authority on all creator/translator withdrawal requests
- **Global config** — revenue splits, view-unit pricing, system broadcasts

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  React 19 + Vite 8 │ React Router v7 │ Pure CSS (BEM)       │
│  Axios │ STOMP WebSocket │ Lucide Icons │ SweetAlert2        │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST API + WebSocket
┌────────────────────────────▼─────────────────────────────────┐
│                        BACKEND                               │
│  Spring Boot (Java 17+) │ Spring Security + JWT (RBAC)       │
│  JPA/Hibernate │ Gemini Vision API (OCR)                     │
└──────┬──────────┬──────────┬──────────┬──────────┬───────────┘
       │          │          │          │          │
  ┌────▼───┐ ┌───▼────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────┐
  │Postgres│ │Cloudin-│ │Stripe │ │ Redis  │ │SendGrid│
  │  (DB)  │ │  ary   │ │(Pay)  │ │(Cache) │ │(Email) │
  └────────┘ └────────┘ └───────┘ └────────┘ └────────┘
```

---

## 💻 Tech Stack

<table>
<tr>
<td width="50%">

### Frontend (This Repo)
| Technology | Purpose |
|:--|:--|
| **React 19** + **Vite 8** | UI framework & bundler |
| **React Router v7** | Client-side routing |
| **Pure CSS (BEM)** | Custom styling — no Tailwind/Bootstrap |
| **Axios** | HTTP client with interceptors |
| **STOMP.js** + **SockJS** | Real-time WebSocket chat |
| **Lucide React** | Icon system |
| **SweetAlert2** | Premium dialog modals |
| **Vitest** + **Testing Library** | Unit & integration tests |

</td>
<td width="50%">

### Backend ([Repo](https://github.com/Hanh246/SEP490_G37_SUM26_JAVA))
| Technology | Purpose |
|:--|:--|
| **Spring Boot** (Java 17+) | REST API framework |
| **PostgreSQL** | Primary database |
| **Redis** | Caching & sessions |
| **Spring Security + JWT** | Auth & RBAC (5 roles) |
| **Cloudinary** | Image & chapter storage |
| **Stripe Connect** | Payment processing |
| **Gemini Vision API** | OCR for comics |
| **SendGrid / SMTP** | Transactional emails |

</td>
</tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** or **yarn**

### Quick Start

```bash
# 1. Clone
git clone https://github.com/Hiepbq2003/ComiVerse_FE.git
cd ComiVerse_FE

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env → set VITE_API_BASE_URL

# 4. Run
npm run dev
# → http://localhost:5173
```

### Available Scripts

| Command | Description |
|:--|:--|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run test` | Run all test suites |
| `npm run test:watch` | Watch mode testing |
| `npm run lint` | Lint with oxlint |

---

## 🔑 Demo Accounts

> Pre-seeded accounts for testing all role-specific workspaces:

| Role | Username | Password |
|:--|:--|:--|
| 🔴 **Admin** | `admin` | `admin123` |
| 🟡 **Moderator** | `moderator1` | `staff123` |
| 🟢 **Author** | `author1` | `staff123` |
| 🔵 **Translator** | `translator1` | `staff123` |
| 🟣 **Project Leader** | `projectleader1` | `staff123` |
| ⚪ **Reader** | `reader1` | `reader123` |

---

## 📁 Project Structure

```
src/
├── assets/          # Images, fonts, 60 CSS modules (BEM)
├── components/      # 56 reusable React components
│   ├── admin/       #   Admin-specific widgets
│   ├── author/      #   Creator studio components
│   ├── chat/        #   Real-time chat system
│   ├── common/      #   Shared UI (headers, modals, cards)
│   ├── layout/      #   Page layouts (Admin, Auth, Main)
│   ├── moderator/   #   Moderation tools
│   ├── payout/      #   Payment & withdrawal UI
│   └── report/      #   Report management
├── config/          # App configuration
├── constants/       # Enums & constants
├── context/         # React contexts (Auth, Notification)
├── hooks/           # 4 custom hooks
├── pages/           # 65 page components
│   ├── admin/       #   Dashboard, accounts, revenue, payouts
│   ├── author/      #   Studio, comics, chapters, earnings
│   ├── common/      #   Home, explore, reader, auth, forum
│   ├── moderator/   #   Review queue, reports, genres
│   └── translator/  #   Workspace, tasks, projects, team
├── services/        # 33 API service modules + WebSocket
├── tests/           # 75 test suites (unit/integration/system)
└── utils/           # Helpers (auth, crypto, export, etc.)
```

---

## 🎨 Design Philosophy

- **Premium Dark Theme** — `#0d0919` base with vibrant purple/orange gradients
- **Glassmorphism** — frosted-glass panels with backdrop-blur effects
- **Zero Framework CSS** — 100% custom-written BEM stylesheets, no Tailwind/Bootstrap
- **Micro-animations** — shimmer skeletons, hover effects, smooth page transitions
- **Responsive** — mobile-first design with iOS PWA install guide

---

## 👥 Team

**SEP490 — Group G37** | FPT University — Summer 2026

| Member | Role |
|:--|:--|
| **Bùi Quang Hiệp** | Frontend Lead, Full-stack Developer |
| **Nguyễn Văn Hạnh** | Backend Lead |
| **Bùi Hưng** | Backend Developer |
| **Nguyễn Ngọc Thanh** | Backend Developer |
| **Đào Tiến Đạt** | Backend Developer |

---

## 📝 License

This project was developed as a capstone project for **FPT University** (SEP490).

---

<div align="center">

**[🌐 Live Demo](https://comi-verse.vercel.app/)** · **[⚙️ Backend Repo](https://github.com/Hanh246/SEP490_G37_SUM26_JAVA)** · **[🔝 Back to Top](#-comiverse)**

*Built with ❤️ by Team G37*

</div>
