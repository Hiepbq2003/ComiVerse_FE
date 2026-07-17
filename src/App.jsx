import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
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
import ChapterDetail from './pages/common/ChapterDetail'
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
import AuthorUploadGuide from './pages/author/AuthorUploadGuide'
import AuthorProfile from './pages/author/AuthorProfile'
import ModeratorDashboard from './pages/moderator/ModeratorDashboard'
import TranslatorDashboard from './pages/translator/TranslatorDashboard'
import Profile from './pages/common/Profile'
import Policy from './pages/common/Policy'
import About from './pages/common/About'
import Terms from './pages/common/Terms'
import Contact from './pages/common/Contact'
import TranslateDashboard from './pages/translator/TranslatorDashboard'
import TranslateWorkspace from './pages/translator/TranslateWorkspace'
import TeamProjects from './pages/translator/TeamProjects'
import ProjectList from './pages/translator/ProjectList'
import TranslatorRevenue from './pages/translator/Revenue'
import TranslatorPayout from './pages/translator/Payout'
import { SkeletonLoaderShowcase } from './components/common/SkeletonLoaderShowcase'
import { AIPopoverShowcase } from './components/common/AIPopoverShowcase'
import { HeaderProfileDropdownShowcase } from './components/common/HeaderProfileDropdownShowcase'
import { ModernButtonShowcase } from './components/common/ModernButtonShowcase'
import { ModernPaginationShowcase } from './components/common/ModernPaginationShowcase'
import { AnimatedButtonShowcase } from './components/common/AnimatedButtonShowcase'
import { getAuth, clearAuth } from './utils/Auth'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Import } from 'lucide-react'
import TranslatorLayout from './components/layout/TranslatorLayout'

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

function ThemedToastContainer() {
  const { theme } = useTheme()
  return <ToastContainer position="top-right" autoClose={3000} theme={theme} />
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <NotificationProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Home */}
                <Route path="/" element={<Home />} />
                {/* Auth */}
                {/* <Route path="/" element={<AuthPage />} /> */}
                <Route path="/oauth2/redirect" element={<AuthPage />} />
                <Route path="/profile" element={<ProfileRouteWrapper />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Public Reader Pages */}
                <Route path="/explore" element={<Explore />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/library" element={<Library />} />
                <Route path="/forum" element={<Forum />} />
                <Route path="/comic/:id" element={<ComicDetail />} />
                <Route path="/comic/:comicId/chapter/:chapterId" element={<ChapterDetail />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/policy" element={<Policy />} />
                <Route path="/about" element={<About />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/contact" element={<Contact />} />
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
                <Route path="/author/upload-guide" element={<AuthorUploadGuide />} />
                <Route path="/author/profile" element={<AuthorProfile />} />
                <Route path="/author/earnings" element={<AuthorEarnings />} />
                <Route path="/author/settings" element={<AuthorSettings />} />
                {/* Translator */}
                <Route path="/translator" element={<TranslatorLayout />}>
                  
                  <Route path="project-list" element={<ProjectList />} />
                  <Route path="project-teams" element={<TeamProjects />} />
                  <Route path="revenue" element={<TranslatorRevenue />} />
                  <Route path="payout" element={<TranslatorPayout />} />
                  <Route path="dashboard" element={<TranslateDashboard />} />
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
              <ThemedToastContainer />
            </BrowserRouter>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App

