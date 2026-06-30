import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import AuthorDashboard from './pages/author/AuthorDashboard'
import AuthorComics from './pages/author/AuthorComics'
import AuthorEarnings from './pages/author/AuthorEarnings'
import AuthorSettings from './pages/author/AuthorSettings'
import Profile from './pages/common/Profile'
import { getAuth, clearAuth } from './utils/Auth'

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
      {/* Author */}
        <Route path="/author/overview" element={<AuthorDashboard />} />
        <Route path="/author/comics" element={<AuthorComics />} />
        <Route path="/author/earnings" element={<AuthorEarnings />} />
        <Route path="/author/settings" element={<AuthorSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

