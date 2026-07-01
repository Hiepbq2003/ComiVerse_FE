# ComiVerse FE — Workspace-Scoped Agent Rules

> These rules ensure consistent code generation across all roles and features. Every agent generating code for ComiVerse_FE MUST follow these rules strictly.

---

## 1. Project Structure Overview

```
ComiVerse_FE/
├── src/
│   ├── App.jsx                         # Root router (BrowserRouter + Routes)
│   ├── main.jsx                        # Entry point, imports index.css
│   ├── assets/
│   │   ├── style/
│   │   │   ├── index.css               # Global CSS variables & reset
│   │   │   ├── App.css                 # General dashboard/auth shared styles
│   │   │   ├── auth.css                # Auth pages (Login/Register/Forgot/Reset)
│   │   │   ├── admin.css               # Admin workspace styles
│   │   │   ├── author.css              # Author workspace styles
│   │   │   ├── moderator.css           # Moderator workspace styles
│   │   │   ├── translator.css          # Translator workspace styles
│   │   │   ├── reader/                 # Reader-facing page styles
│   │   │   │   ├── home.css            # HomeLayout + Home page
│   │   │   │   ├── reader.css          # Explore, ComicDetail, Ranking
│   │   │   │   ├── library.css         # Library page
│   │   │   │   ├── forum.css           # Forum page
│   │   │   │   └── profile.css         # Profile page
│   │   │   ├── moderator/             # Per-subview CSS for Moderator
│   │   │   └── translator/            # Per-subview CSS for Translator
│   │   └── *.png, *.svg               # Static assets
│   ├── components/
│   │   ├── common/                     # Shared/reusable components
│   │   │   └── ComicCard.jsx           # Reusable comic card
│   │   └── layout/                     # Layout wrappers (Header+Sidebar+Footer)
│   │       ├── HomeLayout.jsx          # Reader-facing: Header + Nav + Footer
│   │       ├── AuthLayout.jsx          # Auth pages: Left branding + Right form
│   │       ├── AdminLayout.jsx         # Admin: Sidebar + Topbar + Content
│   │       ├── AuthorLayout.jsx        # Author: Sidebar + Topbar + Content
│   │       └── DashboardLayout.jsx     # Generic dashboard navbar (legacy)
│   ├── pages/
│   │   ├── common/                     # Public / shared-role pages
│   │   ├── admin/                      # Admin role pages
│   │   ├── author/                     # Author role pages
│   │   ├── moderator/                  # Moderator role pages
│   │   └── translator/                 # Translator role pages
│   ├── services/
│   │   └── api/
│   │       ├── AxiosClient.jsx         # Axios instance + interceptors
│   │       └── *Api.jsx                # One file per API domain
│   └── utils/
│       ├── Auth.js                     # getAuth / setAuth / clearAuth
│       └── mockComics.js              # Demo data for offline development
```

---

## 2. Modular UI Dashboard Sub-views

Never build large, consolidated dashboard page files containing multiple distinct sub-views, tabs, or sidebar sections. Each distinct sidebar section, tab, or sub-view **must be decoupled into its own separate file** under the same directory (or a subcomponent directory) and imported into the parent dashboard layout. This maintains visual structure, decoupling, and code readability, matching the architecture utilized for the Admin dashboard views.

**Example — CORRECT** (Admin pattern):
```
pages/admin/
├── AccountManagement.jsx     ← standalone page, wraps itself in AdminLayout
├── BroadcastManagement.jsx
├── StatisticsDashboard.jsx
├── RevenueManagement.jsx
└── PayoutManagement.jsx
```

**Example — INCORRECT** (putting all sub-views in one file):
```
pages/admin/
└── AdminDashboard.jsx        ← 2000+ lines with all views inline ❌
```

---

## 3. Layout Separation Rules

### 3.1 Every workspace role MUST have its own Layout component

Each role (Admin, Author, Moderator, Translator) must have a dedicated **Layout** component in `components/layout/`. A Layout component handles:
- **Sidebar** with navigation items
- **Topbar** with workspace label, notification bell, profile button, logout
- **Content area** that renders `{children}`
- **Auth guard** (check role, redirect if unauthorized)

| Role | Layout File | Location |
|------|-------------|----------|
| Reader/Public | `HomeLayout.jsx` | `components/layout/` |
| Auth (Login/Register) | `AuthLayout.jsx` | `components/layout/` |
| Admin | `AdminLayout.jsx` | `components/layout/` |
| Author | `AuthorLayout.jsx` | `components/layout/` |
| Moderator | Needs `ModeratorLayout.jsx` | `components/layout/` |
| Translator | Needs `TranslatorLayout.jsx` | `components/layout/` |

### 3.2 Pages must NOT contain sidebar/topbar markup

Pages in `pages/{role}/` should only contain page-specific content. They wrap themselves in the appropriate Layout component:

```jsx
// ✅ CORRECT — Page wraps in layout, contains only page content
import AdminLayout from '../../components/layout/AdminLayout'

function AccountManagement() {
  return (
    <AdminLayout activeNav="account-management">
      {/* Page content only */}
    </AdminLayout>
  )
}
```

```jsx
// ❌ INCORRECT — Page contains sidebar/topbar markup
function ModeratorDashboard() {
  return (
    <div className="moderator-layout">
      <aside className="moderator-sidebar">...</aside>  {/* ← NO! */}
      <main>
        <header className="moderator-topbar">...</header>  {/* ← NO! */}
        ...
      </main>
    </div>
  )
}
```

### 3.3 Reader-facing pages use HomeLayout

All public/reader pages (Home, Explore, Ranking, Library, Forum, ComicDetail, SearchResults) must wrap in `HomeLayout`:

```jsx
import HomeLayout from '../../components/layout/HomeLayout'

function Explore() {
  return (
    <HomeLayout>
      {/* Explore page content */}
    </HomeLayout>
  )
}
```

---

## 4. Shared Component Rules

### 4.1 No copy-paste of shared logic

When the same UI pattern or logic appears in 2+ places, it **MUST** be extracted into a shared component in `components/common/`. Known patterns that are currently duplicated and should remain centralized:

| Pattern | Where it lives / should live |
|---------|------------------------------|
| Notification bell + dropdown | Should be in `components/common/NotificationBell.jsx` |
| User menu dropdown | Part of `HomeLayout.jsx` header |
| Search bar with suggestions | Part of `HomeLayout.jsx` header |
| ComiVerse logo (SVG + text) | Inline in multiple layouts → should be `components/common/Logo.jsx` |
| Sign-out confirmation modal | Part of `HomeLayout.jsx` → could be shared |
| `formatTimeAgo()` utility | Should be in `utils/formatTimeAgo.js` |

### 4.2 Component file naming

- Use **PascalCase** for component files: `ComicCard.jsx`, `NotificationBell.jsx`
- One component per file, default export matches filename
- Group by purpose:
  - `components/common/` — Reusable across all roles
  - `components/layout/` — Layout wrappers only

### 4.3 ComicCard component

Use the existing `ComicCard` component for any comic card rendering. Do NOT create inline comic card markup. Import from:
```jsx
import ComicCard from '../../components/common/ComicCard'
```

---

## 5. CSS Architecture & Naming Rules

### 5.1 Global design tokens

All design tokens (colors, fonts, shadows) are defined in `assets/style/index.css` using CSS custom properties. Always use these variables:

```css
/* Primary colors */
--accent: #aa3bff;            /* Light mode */
--accent: #c084fc;            /* Dark mode */

/* Text */
--text: #6b6375;              /* Body text */
--text-h: #08060d;            /* Heading text */

/* Surfaces */
--bg: #fff;                   /* Background */
--border: #e5e4e7;            /* Border */

/* Fonts */
--sans: system-ui, 'Segoe UI', Roboto, sans-serif;
--heading: system-ui, 'Segoe UI', Roboto, sans-serif;
```

### 5.2 CSS file organization

- **One CSS file per role**: `admin.css`, `author.css`, `moderator.css`, `translator.css`
- **Sub-view CSS**: For modular sub-views, create CSS in `assets/style/{role}/{subview}.css`
- **Reader pages**: CSS in `assets/style/reader/{page}.css`
- **Never put CSS in JSX files** (no CSS-in-JS). Use separate `.css` files only
- **Exception**: Minor inline styles for truly dynamic values (e.g., conditional colors) are acceptable

### 5.3 CSS class naming convention

Use **role-prefixed BEM-like** naming:

```css
/* Layout */
.{role}-layout                  /* Root container */
.{role}-sidebar                 /* Sidebar */
.{role}-sidebar-brand           /* Sidebar brand section */
.{role}-sidebar-nav             /* Sidebar navigation */
.{role}-nav-item                /* Navigation item */
.{role}-nav-item.active         /* Active nav item */
.{role}-sidebar-footer          /* Sidebar footer (back to home) */
.{role}-main                    /* Main content area */
.{role}-topbar                  /* Topbar header */
.{role}-topbar-left             /* Topbar left section */
.{role}-topbar-right            /* Topbar right section */
.{role}-page-content            /* Page content wrapper */

/* Examples */
.admin-layout, .admin-sidebar, .admin-nav-item
.author-layout, .author-sidebar, .author-nav-item
.moderator-layout, .moderator-sidebar, .moderator-nav-item
.translator-layout, .translator-sidebar, .translator-nav-item
```

### 5.4 Dark theme as default

ComiVerse uses a dark theme for all workspace dashboards:
- Background: Deep dark (`#0d0919`, `#0f0a1a`, `#1a1a2e` range)
- Text: Light gray (`#e2e8f0`, `#94a3b8`)
- Accent: Purple gradient (`#a855f7` → `#ec4899`)
- Borders: Subtle white opacity (`rgba(255, 255, 255, 0.06-0.12)`)
- Cards/surfaces: Slightly lighter dark with glassmorphism (`rgba(255, 255, 255, 0.03-0.06)`)

---

## 6. Workspace Sidebar Pattern

### 6.1 Standard sidebar structure

Every workspace layout sidebar must follow this pattern:

```jsx
<aside className="{role}-sidebar">
  {/* Brand */}
  <div className="{role}-sidebar-brand">
    <h2>{Title}</h2>          {/* e.g. "Admin Portal", "Author Hub" */}
    <span>{Subtitle}</span>   {/* e.g. "System Administration" */}
  </div>

  {/* Navigation */}
  <nav className="{role}-sidebar-nav">
    {navItems.map(item => (
      <Link
        key={item.id}
        to={item.path}
        className={`{role}-nav-item ${activeNav === item.id ? 'active' : ''}`}
      >
        {renderNavIcon(item.icon)}
        {item.label}
      </Link>
    ))}
  </nav>

  {/* Footer — Back to Home */}
  <div className="{role}-sidebar-footer">
    <button className="{role}-nav-item" onClick={() => navigate('/')}>
      ← Back to Home
    </button>
  </div>
</aside>
```

### 6.2 Navigation items configuration

Define nav items as a data array, NOT inline JSX:

```jsx
const navItems = [
  { id: 'overview', label: 'Overview', icon: 'overview', path: '/author/overview' },
  { id: 'comics', label: 'My Comics', icon: 'comics', path: '/author/comics' },
  // ...
]
```

### 6.3 Active navigation

- Use `activeNav` prop to highlight the current page
- For layouts using `<Link>`, compare with `item.id` or `location.pathname`

---

## 7. Workspace Topbar Pattern

### 7.1 Standard topbar structure

```jsx
<header className="{role}-topbar">
  <div className="{role}-topbar-left">
    <span>Workspace:</span>
    <span className="workspace-label">{Role Name}</span>
  </div>

  <div className="{role}-topbar-right">
    {/* Notification Bell */}
    <button className="{role}-notification-btn" title="Notifications">
      <svg>...</svg>  {/* Bell icon */}
    </button>

    <div className="topbar-divider" />

    {/* Profile */}
    <button className="{role}-profile-btn" onClick={() => navigate('/profile')}>
      <svg>...</svg>  {/* User icon */}
      <span>{userName}</span>
    </button>

    <div className="topbar-divider" />

    {/* Logout */}
    <button className="{role}-topbar-btn logout" onClick={handleLogout}>
      <svg>...</svg>  {/* Logout icon */}
      Logout
    </button>
  </div>
</header>
```

---

## 8. API Service Rules

### 8.1 AxiosClient

All API calls go through the shared Axios instance at `services/api/AxiosClient.jsx`. Features:
- Base URL from `import.meta.env.VITE_API_BASE_URL` (fallback: `/api`)
- Auto-attaches `Bearer` token from `getAuth()`
- Auto-handles 401 (session expired → clear auth + redirect)
- Auto-handles 403, 500 with toast messages
- Response interceptor unwraps `response.data.data` or `response.data`

### 8.2 API file pattern

One file per API domain. File naming: `{Domain}Api.jsx`

```jsx
// services/api/ComicApi.jsx
import AxiosClient from './AxiosClient'

export const getAllComicsApi = () => {
  return AxiosClient.get('/comics')
}

export const getComicByIdApi = (id) => {
  return AxiosClient.get(`/comics/${id}`)
}

export const createComicApi = (data) => {
  return AxiosClient.post('/comics', data)
}
```

**Rules:**
- Export named functions, NOT default export
- Function naming: `{verb}{Domain}Api` (e.g., `getAllComicsApi`, `createComicApi`)
- Always return the AxiosClient promise directly
- No try/catch inside API files — let callers handle errors

### 8.3 Existing API files

| File | Domain |
|------|--------|
| `AuthApi.jsx` | Authentication (login, register, OAuth) |
| `AccountApi.jsx` | Account management (CRUD, ban/unban) |
| `ComicApi.jsx` | Comics (CRUD, pagination) |
| `AuthorComicApi.jsx` | Author-specific comic operations |
| `GenreApi.jsx` | Genre CRUD |
| `BroadcastApi.jsx` | Broadcast/announcement management |
| `NotificationApi.jsx` | Notifications (get, mark read) |
| `ProjectTeamApi.jsx` | Translation project teams |
| `SubmissionApi.jsx` | Chapter/comic submissions review |
| `TeamWorkspaceApi.jsx` | Team workspace operations |
| `TranslationPoolApi.jsx` | Translation job pool |
| `ChatFlagApi.jsx` | Chat moderation flags |
| `ForumThreadApi.jsx` | Forum thread operations |

---

## 9. Authentication & Authorization Rules

### 9.1 Auth utility

Use `utils/Auth.js` for all auth operations:

```jsx
import { getAuth, setAuth, clearAuth } from '../../utils/Auth'

// getAuth() → { token: string, user: { id, fullName, username, email, role, avatarUrl } } | null
// setAuth(token, user) → saves to localStorage
// clearAuth() → removes from localStorage
```

### 9.2 Role-based access

Workspace layouts MUST check user role on mount and redirect if unauthorized:

```jsx
useEffect(() => {
  const auth = getAuth()
  if (!auth || !auth.user || auth.user.role?.toUpperCase() !== 'ADMIN') {
    navigate('/', { replace: true })
  }
}, [navigate])
```

### 9.3 User roles

| Role | Dashboard Path | Layout |
|------|---------------|--------|
| `READER` / `USER` | No workspace dashboard | HomeLayout only |
| `AUTHOR` | `/author/*` | AuthorLayout |
| `ADMIN` | `/admin/*` | AdminLayout |
| `MODERATOR` | `/moderator/*` | ModeratorLayout |
| `TRANSLATOR` | `/translator/*` | TranslatorLayout |

---

## 10. Routing Rules

### 10.1 Route organization in App.jsx

Group routes by role with comments:

```jsx
{/* Public Reader Pages */}
<Route path="/" element={<Home />} />
<Route path="/explore" element={<Explore />} />
<Route path="/ranking" element={<Ranking />} />

{/* Auth */}
<Route path="/auth" element={<AuthPage />} />

{/* Admin */}
<Route path="/admin/statistics" element={<StatisticsDashboard />} />
<Route path="/admin/revenue" element={<RevenueManagement />} />

{/* Author */}
<Route path="/author/overview" element={<AuthorDashboard />} />
```

### 10.2 URL conventions

- Public pages: `/{page}` (e.g., `/explore`, `/ranking`, `/forum`)
- Workspace pages: `/{role}/{feature}` (e.g., `/admin/account-management`)
- Detail pages: `/{resource}/:id` (e.g., `/comic/:id`, `/author/comics/:id`)

---

## 11. Toast Notification Rules

Use `react-toastify` for all user-facing notifications:

```jsx
import { toast } from 'react-toastify'

toast.success('Operation completed!')
toast.error('Something went wrong.')
toast.info('FYI: data was updated.')
toast.warning('Please check your input.')
```

- `ToastContainer` is configured globally in `App.jsx` with `position="top-right"`, `autoClose={3000}`, `theme="dark"`
- **NEVER** build custom toast/snackbar components — always use `react-toastify`

---

## 12. Technology Stack & Dependencies

| Package | Purpose | Version |
|---------|---------|---------|
| `react` | UI library | ^19.x |
| `react-dom` | DOM rendering | ^19.x |
| `react-router-dom` | Routing | ^7.x |
| `axios` | HTTP client | ^1.x |
| `react-toastify` | Toast notifications | ^11.x |
| `vite` | Build tool | ^8.x |

**Rules:**
- Do NOT add new UI libraries (Material UI, Ant Design, Chakra, etc.) without explicit user approval
- Do NOT add Tailwind CSS — this project uses vanilla CSS
- Do NOT add state management libraries (Redux, Zustand, etc.) — use React state + props + context
- Icons are inline SVG — do NOT add icon libraries (lucide, heroicons, etc.) without approval

---

## 13. Code Style Rules

### 13.1 Component structure

```jsx
// 1. Imports (React, router, components, services, styles, assets)
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SomeLayout from '../../components/layout/SomeLayout'
import { someApi } from '../../services/api/SomeApi'
import '../../assets/style/some.css'

// 2. Constants / Mock data (if needed)
const ITEMS_PER_PAGE = 10

// 3. Component function
function ComponentName() {
  // 3a. Hooks (state, refs, effects)
  // 3b. Handler functions
  // 3c. Render helpers
  // 3d. Return JSX

  return (
    <SomeLayout activeNav="feature">
      {/* Page content */}
    </SomeLayout>
  )
}

// 4. Export
export default ComponentName
```

### 13.2 Function components only

- Use `function` declarations, NOT arrow function components
- Use `function ComponentName()` NOT `const ComponentName = () =>`

### 13.3 Naming conventions

| Type | Convention | Example |
|------|-----------|---------|
| Component | PascalCase | `AccountManagement` |
| File (component) | PascalCase.jsx | `AccountManagement.jsx` |
| File (utility) | camelCase.js | `formatTimeAgo.js` |
| File (API) | PascalCase.jsx | `ComicApi.jsx` |
| File (CSS) | kebab-case.css | `comic-management.css` |
| CSS class | kebab-case with role prefix | `.admin-sidebar-nav` |
| State variable | camelCase | `isLoading`, `showModal` |
| Handler function | `handle` prefix | `handleSubmit`, `handleLogout` |
| API function | `{verb}{Domain}Api` | `getAllComicsApi` |

---

## 14. Mock Data / Fallback Pattern

When building pages that depend on backend APIs, follow this pattern:

```jsx
// 1. Define mock data as a constant
const MOCK_DATA = [...]

// 2. Try API first, fall back to mock
useEffect(() => {
  const fetchData = async () => {
    try {
      const data = await someApi()
      setData(data)
    } catch (err) {
      console.error('API failed, using mock data:', err.message)
      setData(MOCK_DATA)
      setIsMockData(true)
    } finally {
      setIsLoading(false)
    }
  }
  fetchData()
}, [])
```

---

## 15. Summary: Layout Reference Quick Table

| Role | Layout Component | Sidebar | Topbar | CSS File | Route Prefix |
|------|-----------------|---------|--------|----------|--------------|
| Reader | `HomeLayout` | ❌ (uses header nav) | ❌ (header) | `reader/home.css` | `/` |
| Auth | `AuthLayout` | ❌ | ❌ | `auth.css` | `/auth` |
| Admin | `AdminLayout` | ✅ | ✅ | `admin.css` | `/admin/*` |
| Author | `AuthorLayout` | ✅ | ✅ | `author.css` | `/author/*` |
| Moderator | `ModeratorLayout` (needed) | ✅ | ✅ | `moderator.css` | `/moderator/*` |
| Translator | `TranslatorLayout` (needed) | ✅ | ✅ | `translator.css` | `/translator/*` |
