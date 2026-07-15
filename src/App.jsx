import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { getAuth, clearAuth } from './utils/Auth'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const AuthPage = lazy(() => import('./pages/common/AuthPage'))
const Home = lazy(() => import('./pages/common/Home'))
const Explore = lazy(() => import('./pages/common/Explore'))
const Ranking = lazy(() => import('./pages/common/Ranking'))
const Library = lazy(() => import('./pages/common/Library'))
const Forum = lazy(() => import('./pages/common/Forum'))
const ComicDetail = lazy(() => import('./pages/common/ComicDetail'))
const SearchResults = lazy(() => import('./pages/common/SearchResults'))
const Profile = lazy(() => import('./pages/common/Profile'))
const Policy = lazy(() => import('./pages/common/Policy'))

const AccountManagement = lazy(() => import('./pages/admin/AccountManagement'))
const BroadcastManagement = lazy(() => import('./pages/admin/BroadcastManagement'))
const StatisticsDashboard = lazy(() => import('./pages/admin/StatisticsDashboard'))
const RevenueManagement = lazy(() => import('./pages/admin/RevenueManagement'))
const PayoutManagement = lazy(() => import('./pages/admin/PayoutManagement'))
const AdminSystemSettings = lazy(() => import('./pages/admin/AdminSystemSettings'))

const AuthorDashboard = lazy(() => import('./pages/author/AuthorDashboard'))
const AuthorComics = lazy(() => import('./pages/author/AuthorComics'))
const AuthorComicDetail = lazy(() => import('./pages/author/AuthorComicDetail'))
const AuthorEarnings = lazy(() => import('./pages/author/AuthorEarnings'))
const AuthorSettings = lazy(() => import('./pages/author/AuthorSettings'))
const AuthorUploadGuide = lazy(() => import('./pages/author/AuthorUploadGuide'))
const AuthorProfile = lazy(() => import('./pages/author/AuthorProfile'))

const ModeratorDashboard = lazy(() => import('./pages/moderator/ModeratorDashboard'))
const TranslatorDashboard = lazy(() => import('./pages/translator/TranslatorDashboard'))
const TranslateWorkspace = lazy(() => import('./pages/translator/TranslateWorkspace'))
const TeamProjects = lazy(() => import('./pages/translator/TeamProjects'))
const ProjectList = lazy(() => import('./pages/translator/ProjectList'))
const TranslatorRevenue = lazy(() => import('./pages/translator/Revenue'))
const TranslatorPayout = lazy(() => import('./pages/translator/Payout'))
const TranslatorLayout = lazy(() => import('./components/layout/TranslatorLayout'))

const SkeletonLoaderShowcase = lazy(() => import('./components/common/SkeletonLoaderShowcase').then((module) => ({ default: module.SkeletonLoaderShowcase })))
const AIPopoverShowcase = lazy(() => import('./components/common/AIPopoverShowcase').then((module) => ({ default: module.AIPopoverShowcase })))
const HeaderProfileDropdownShowcase = lazy(() => import('./components/common/HeaderProfileDropdownShowcase').then((module) => ({ default: module.HeaderProfileDropdownShowcase })))
const ModernButtonShowcase = lazy(() => import('./components/common/ModernButtonShowcase').then((module) => ({ default: module.ModernButtonShowcase })))
const ModernPaginationShowcase = lazy(() => import('./components/common/ModernPaginationShowcase').then((module) => ({ default: module.ModernPaginationShowcase })))
const AnimatedButtonShowcase = lazy(() => import('./components/common/AnimatedButtonShowcase').then((module) => ({ default: module.AnimatedButtonShowcase })))

function ProfileRouteWrapper() {
  const auth = getAuth()
  if (!auth || !auth.user) {
    return <Navigate to="/" replace />
  }
  const handleLogout = () => {
    clearAuth()
    window.location.href = '/'
  }
  return <Profile user={auth.user} onLogout={handleLogout} />
}

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="route-loading" role="status">Loading page...</div>}>
                <Routes>
                {/* Public Home */}
                <Route path="/" element={<Home />} />
                {/* Auth */}
                <Route path="/" element={<AuthPage />} />
                <Route path="/oauth2/redirect" element={<AuthPage />} />
                <Route path="/profile" element={<ProfileRouteWrapper />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Public Reader Pages */}
                <Route path="/explore" element={<Explore />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/library" element={<Library />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/comic/:id" element={<ComicDetail />} />
                <Route path="/search" element={<SearchResults />} />
                {/* Admin */}
                <Route path="/admin/statistics" element={<StatisticsDashboard />} />
                <Route path="/admin/revenue" element={<RevenueManagement />} />
                <Route path="/admin/account-management" element={<AccountManagement />} />
                <Route path="/admin/broadcast" element={<BroadcastManagement />} />
                <Route path="/admin/payout" element={<PayoutManagement />} />
                <Route path="/admin/settings" element={<AdminSystemSettings />} />
                {/* Moderator */}
                <Route path="/moderator" element={<ModeratorDashboard />} />
                {/* Translator */}
                <Route path="/translator" element={<TranslatorDashboard />} />
                {/* Author */}
                <Route path="/author/overview" element={<AuthorDashboard />} />
                <Route path="/author/comics" element={<AuthorComics />} />
                <Route path="/author/comics/:id" element={<AuthorComicDetail />} />
                <Route path="/author/profile" element={<AuthorProfile />} />
                <Route path="/author/earnings" element={<AuthorEarnings />} />
                <Route path="/author/settings" element={<AuthorSettings />} />
                {/* Translator */}
                <Route path="/translator" element={<TranslatorLayout />}>
                  
                  <Route path="project-list" element={<ProjectList />} />
                  <Route path="project-teams" element={<TeamProjects />} />
                  <Route path="revenue" element={<TranslatorRevenue />} />
                  <Route path="payout" element={<TranslatorPayout />} />
                  <Route path="dashboard" element={<TranslatorDashboard />} />
                </Route>
                <Route path="/translator/translate-workspace/task/:taskId" element={<TranslateWorkspace />} />
                

                {/* Showcase Demos */}
                <Route path="/showcase/skeletons" element={<SkeletonLoaderShowcase />} />
                <Route path="/showcase/popovers" element={<AIPopoverShowcase />} />
                <Route path="/showcase/profile-menu" element={<HeaderProfileDropdownShowcase />} />
                <Route path="/showcase/buttons" element={<ModernButtonShowcase />} />
                <Route path="/showcase/paginations" element={<ModernPaginationShowcase />} />
                <Route path="/showcase/animated-buttons" element={<AnimatedButtonShowcase />} />
                </Routes>
              </Suspense>
              <ToastContainer position="top-right" autoClose={3000} theme="dark" />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

