import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import AuthPage from './pages/common/AuthPage'
import Home from './pages/common/Home'
import Explore from './pages/common/Explore'
import Ranking from './pages/common/Ranking'
import Library from './pages/common/Library'
import Forum from './pages/common/Forum'
import ComicDetail from './pages/common/ComicDetail'
import SearchResults from './pages/common/SearchResults'
import AccountManagement from './pages/admin/AccountManagement'
import BroadcastManagement from './pages/admin/BroadcastManagement'
import StatisticsDashboard from './pages/admin/StatisticsDashboard'
import RevenueManagement from './pages/admin/RevenueManagement'
import PayoutManagement from './pages/admin/PayoutManagement'
import AdminSystemSettings from './pages/admin/AdminSystemSettings'
import AuthorDashboard from './pages/author/AuthorDashboard'
import AuthorComics from './pages/author/AuthorComics'
import AuthorComicDetail from './pages/author/AuthorComicDetail'
import AuthorEarnings from './pages/author/AuthorEarnings'
import AuthorSettings from './pages/author/AuthorSettings'
import AuthorProfile from './pages/author/AuthorProfile'
import ModeratorDashboard from './pages/moderator/ModeratorDashboard'
import TranslatorDashboard from './pages/translator/TranslatorDashboard'
import Profile from './pages/common/Profile'
import { SkeletonLoaderShowcase } from './components/common/SkeletonLoaderShowcase'
import { AIPopoverShowcase } from './components/common/AIPopoverShowcase'
import { HeaderProfileDropdownShowcase } from './components/common/HeaderProfileDropdownShowcase'
import { ModernButtonShowcase } from './components/common/ModernButtonShowcase'
import { ModernPaginationShowcase } from './components/common/ModernPaginationShowcase'
import { AnimatedButtonShowcase } from './components/common/AnimatedButtonShowcase'
import { getAuth, clearAuth } from './utils/Auth'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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
                
                {/* Showcase Demos */}
                <Route path="/showcase/skeletons" element={<SkeletonLoaderShowcase />} />
                <Route path="/showcase/popovers" element={<AIPopoverShowcase />} />
                <Route path="/showcase/profile-menu" element={<HeaderProfileDropdownShowcase />} />
                <Route path="/showcase/buttons" element={<ModernButtonShowcase />} />
                <Route path="/showcase/paginations" element={<ModernPaginationShowcase />} />
                <Route path="/showcase/animated-buttons" element={<AnimatedButtonShowcase />} />
              </Routes>
              <ToastContainer position="top-right" autoClose={3000} theme="dark" />
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App

