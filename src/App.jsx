import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Eager loaded components (critical for initial paint or layout)
import Home from './pages/common/Home'
import AuthPage from './pages/common/AuthPage'
import ModeratorLayout from './components/layout/ModeratorLayout'
import AdminLayout from './components/layout/AdminLayout'
import TranslatorLayout from './components/layout/TranslatorLayout'
import AuthorLayout from './components/layout/AuthorLayout'
import ScrollToTop from './components/common/ScrollToTop'
import FullScreenLoader from './components/common/FullScreenLoader'
import { getAuth, clearAuth } from './utils/Auth'

// Lazy loaded pages (Common)
const Explore = lazy(() => import('./pages/common/Explore'))
const Ranking = lazy(() => import('./pages/common/Ranking'))
const Library = lazy(() => import('./pages/common/Library'))
const Forum = lazy(() => import('./pages/common/Forum'))
const ComicDetail = lazy(() => import('./pages/common/ComicDetail'))
const ChapterDetail = lazy(() => import('./pages/common/ChapterDetail'))
const SearchResults = lazy(() => import('./pages/common/SearchResults'))
const Profile = lazy(() => import('./pages/common/Profile'))
const Policy = lazy(() => import('./pages/common/Policy'))
const About = lazy(() => import('./pages/common/About'))
const Terms = lazy(() => import('./pages/common/Terms'))
const Contact = lazy(() => import('./pages/common/Contact'))
const IosInstallGuide = lazy(() => import('./pages/common/IosInstallGuide'))
const SubscriptionResult = lazy(() => import('./pages/common/SubscriptionResult'))
const TranslatorRegister = lazy(() => import('./pages/common/TranslatorRegister'))

// Lazy loaded pages (Admin)
const AccountManagement = lazy(() => import('./pages/admin/AccountManagement'))
const BroadcastManagement = lazy(() => import('./pages/admin/BroadcastManagement'))
const StatisticsDashboard = lazy(() => import('./pages/admin/StatisticsDashboard'))
const RevenueManagement = lazy(() => import('./pages/admin/RevenueManagement'))
const PayoutManagement = lazy(() => import('./pages/admin/PayoutManagement'))
const PayoutSettings = lazy(() => import('./pages/admin/PayoutSettings'))
const SubscriptionManagement = lazy(() => import('./pages/admin/SubscriptionManagement'))

// Lazy loaded pages (Author)
const AuthorDashboard = lazy(() => import('./pages/author/AuthorDashboard'))
const AuthorComics = lazy(() => import('./pages/author/AuthorComics'))
const AuthorComicDetail = lazy(() => import('./pages/author/AuthorComicDetail'))
const AuthorRevenue = lazy(() => import('./pages/author/AuthorRevenue'))
const AuthorPayout = lazy(() => import('./pages/author/AuthorPayout'))
const AuthorSettings = lazy(() => import('./pages/author/AuthorSettings'))
const AuthorProfile = lazy(() => import('./pages/author/AuthorProfile'))
const AuthorChapterPreview = lazy(() => import('./pages/author/AuthorChapterPreview'))

// Lazy loaded pages (Moderator)
const ModeratorDashboard = lazy(() => import('./pages/moderator/ModeratorDashboard'))
const ModeratorComicDetail = lazy(() => import('./pages/moderator/ModeratorComicDetail'))
const ModeratorReports = lazy(() => import('./pages/moderator/ModeratorReports'))
const ReportCategories = lazy(() => import('./pages/moderator/ReportCategories'))

// Lazy loaded pages (Translator)
const TranslatorDashboard = lazy(() => import('./pages/translator/TranslatorDashboard'))
const TranslateWorkspace = lazy(() => import('./pages/translator/TranslateWorkspace'))
const ReviewWorkspace = lazy(() => import('./pages/translator/ReviewWorkspace'))
const TeamProjects = lazy(() => import('./pages/translator/TeamProjects'))
const ProjectList = lazy(() => import('./pages/translator/ProjectList'))
const TranslatorRevenue = lazy(() => import('./pages/translator/Revenue'))
const TranslatorPayout = lazy(() => import('./pages/translator/Payout'))
const LeaderReports = lazy(() => import('./pages/translator/LeaderReports'))

// Showcases
const SkeletonLoaderShowcase = lazy(() => import('./components/common/SkeletonLoaderShowcase'))
const AIPopoverShowcase = lazy(() => import('./components/common/AIPopoverShowcase'))
const HeaderProfileDropdownShowcase = lazy(() => import('./components/common/HeaderProfileDropdownShowcase'))
const ModernButtonShowcase = lazy(() => import('./components/common/ModernButtonShowcase'))
const ModernPaginationShowcase = lazy(() => import('./components/common/ModernPaginationShowcase'))
const AnimatedButtonShowcase = lazy(() => import('./components/common/AnimatedButtonShowcase'))


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
              <ScrollToTop />
              <Suspense fallback={<FullScreenLoader />}>
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
                  <Route path="/forum/thread/:threadId" element={<Forum />} />
                  <Route path="/comic/:id" element={<ComicDetail />} />
                  <Route path="/comics/:id" element={<ComicDetail />} />
                  <Route path="/comic/:comicId/chapter/:chapterId" element={<ChapterDetail />} />
                  <Route path="/chapters/:chapterId" element={<ChapterDetail />} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/policy" element={<Policy />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/download/ios" element={<IosInstallGuide />} />
                  <Route path="/translator-register" element={<TranslatorRegister />} />
                  <Route path="/subscription/success" element={<SubscriptionResult />} />
                  <Route path="/subscription/cancel" element={<SubscriptionResult cancelled />} />
                  {/* Admin */}
                  <Route path="/admin/statistics" element={<StatisticsDashboard />} />
                  <Route path="/admin/revenue" element={<RevenueManagement />} />
                  <Route path="/admin/account-management" element={<AccountManagement />} />
                  <Route path="/admin/broadcast" element={<BroadcastManagement />} />
                  <Route path="/admin/payout" element={<PayoutManagement />} />
                  <Route path="/admin/payout/history" element={<PayoutManagement historyMode />} />
                  <Route path="/admin/payout/settings" element={<PayoutSettings />} />
                  <Route path="/admin/subscriptions" element={<SubscriptionManagement />} />
                  <Route path="/admin/report-categories" element={<AdminLayout activeNav="report-categories"><ReportCategories roleScope="ALL" /></AdminLayout>} />
                  {/* Moderator */}
                  <Route path="/moderator" element={<ModeratorDashboard />} />
                  <Route path="/moderator/comic/:id" element={<ModeratorComicDetail />} />
                  <Route path="/moderator/reports" element={<ModeratorLayout activeNav="reports"><ModeratorReports /></ModeratorLayout>} />
                  <Route path="/moderator/report-categories" element={<ModeratorLayout activeNav="report-categories"><ReportCategories roleScope="MODERATOR" /></ModeratorLayout>} />
                  
                  {/* Leader Reports */}
                  <Route path="/leader/reports" element={<TranslatorLayout><LeaderReports /></TranslatorLayout>} />

                  {/* Author - persistent layout prevents sidebar/topbar remount flicker */}
                  <Route path="/author" element={<AuthorLayout />}>
                    <Route index element={<Navigate to="overview" replace />} />
                    <Route path="overview" element={<AuthorDashboard />} />
                    <Route path="comics" element={<AuthorComics />} />
                    <Route path="comics/:id" element={<AuthorComicDetail />} />
                    <Route path="profile" element={<AuthorProfile />} />
                    <Route path="earnings" element={<Navigate to="../revenue" replace />} />
                    <Route path="revenue" element={<AuthorRevenue />} />
                    <Route path="payout" element={<AuthorPayout />} />
                    <Route path="settings" element={<AuthorSettings />} />
                  </Route>
                  <Route path="/author/comics/:comicId/preview/:chapterId" element={<AuthorChapterPreview />} />
                  {/* Translator */}
                  <Route path="/translator" element={<TranslatorLayout />}>
                    <Route path="dashboard" element={<TranslatorDashboard />} />
                    <Route path="project-list" element={<ProjectList />} />
                    <Route path="project-teams" element={<TeamProjects />} />
                    <Route path="reports" element={<LeaderReports />} />
                    <Route path="revenue" element={<TranslatorRevenue />} />
                    <Route path="payout" element={<TranslatorPayout />} />
                  </Route>
                  <Route path="/translator/translate-workspace/task/:taskId" element={<TranslateWorkspace />} />
                  <Route path="/translator/review-workspace/task/:taskId" element={<ReviewWorkspace />} />

                  {/* Showcase Demos */}
                  <Route path="/showcase/skeletons" element={<SkeletonLoaderShowcase />} />
                  <Route path="/showcase/popovers" element={<AIPopoverShowcase />} />
                  <Route path="/showcase/profile-menu" element={<HeaderProfileDropdownShowcase />} />
                  <Route path="/showcase/buttons" element={<ModernButtonShowcase />} />
                  <Route path="/showcase/paginations" element={<ModernPaginationShowcase />} />
                  <Route path="/showcase/animated-buttons" element={<AnimatedButtonShowcase />} />
                </Routes>
              </Suspense>
              <ThemedToastContainer />
            </BrowserRouter>
          </NotificationProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App

