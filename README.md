# ComiVerse

🌍 **Live Demo:** [https://comi-verse.vercel.app/](https://comi-verse.vercel.app/)

![ComiVerse Hero](./src/assets/comic_action.png)

**ComiVerse** is a modern, premium comic and manga reading platform featuring dynamic workflows for readers, independent authors, crowdsourced translation teams, and content moderators. Built with high aesthetic standards (glassmorphism, modern typography, fluid animations), it bridges the gap between content creators and international audiences through its built-in translation and moderation hubs.

---

## 🌟 Main Workflows & Features by Role

### 📖 1. Reader (Public User)
**Main Workflow:** Explore Comics -> Read Chapters -> Engage with Community -> Purchase Premium Content.
- **Immersive Reading Experience**: Full-screen reading mode with a smart-scroll behavior that auto-hides navigation headers to maximize screen real estate. Supports theme switching (Dark/Light) and layout toggles (Vertical/Single page).
- **Zero-Latency Preloading**: The next 3 image pages are silently preloaded in the background, ensuring users never encounter a loading spinner while flipping pages.
- **Personalized Library & Reading History**: Automatically tracks reading progress down to the exact page. Robust bookmarking and "save" mechanisms for managing personal libraries.
- **Community & Social Interaction**: Integrated forum discussions, real-time chapter comments, and a 5-star rating system that directly impacts the platform's ranking algorithms.
- **Premium Purchases**: Unlock premium-locked chapters directly using account wallet balances.

### ✍️ 2. Author (Content Creator)
**Main Workflow:** Create/Upload -> Publication Configuration -> Engage Readers -> Earn Revenue.
- **Creator Studio Dashboard**: Dedicated workspace featuring real-time charts for revenue, views, and followers (integrated with Recharts).
- **Comic & Chapter Management**: Bulk image upload support with automatic file-name sorting. Authors can configure chapters as Free or Premium.
- **Publication Workflow**: Set comic statuses (Ongoing, Completed, Hiatus) and manage copyright licensing requests for each series.
- **Monetization & Payouts**: Automated revenue calculation (Ledger) based on unique chapter views (View-unit rate) and premium purchases. Authors can request direct bank withdrawals via **Stripe Connect**.

### 🌐 3. Translator & Project Leader (Localization Team)
**Main Workflow:** Receive Project -> Delegate Tasks -> Translate & Review -> Publish -> Earn Page-based Payouts.
- **Kanban Task Breakdown**: Project Leaders receive translation projects and delegate chapters to team members using a Kanban board (To Do -> In Progress -> Review Queue -> Completed).
- **Split-Screen Translation Workspace**: A side-by-side workspace: Original (Raw) content on the left, Translation input on the right. Allows translators to work directly on the platform without external software.
- **Approval & Quality Control**: Project Leaders can Approve or Reject translations, leaving direct contextual feedback for the translators.
- **Translator Payout Ledger**: System automatically calculates compensation based on the **number of successfully translated pages**. Configurable fixed rates (e.g., $3.50/page) and monthly withdrawal limits.

### 🛡️ 4. Moderator (Content & Community Police)
**Main Workflow:** Receive Tickets -> Investigate Evidence -> Issue Penalties.
- **Content Review Queue**: Automated distribution of user reports (e.g., Violence, Copyright, Spam). Moderators review flagged content from Authors or Translators.
- **Split-Screen Inspection**: Specialized tool allowing Moderators to directly compare a reported translation against the original raw chapter to catch translation errors or policy violations.
- **Takedown & Account Strikes**: Enforce the Strike System. Ability to Mute or Ban violating accounts, or execute DMCA Takedowns on entire chapters, triggering automated warning emails.

### ⚙️ 5. Administrator (Super User)
**Main Workflow:** Monitor System -> Configure Parameters -> Approve Financial Flows.
- **System Command Dashboard**: Comprehensive bird's-eye view of user growth, platform revenue, and server health.
- **Financial & Payout Approvals**: Manage all withdrawal requests from Creators and Translators. Admins have final Approval authority before triggering actual bank transfers via the Stripe API.
- **Global Configuration**: Configure platform-wide parameters such as revenue splits, view-unit pricing, and Global System Broadcasts.

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
