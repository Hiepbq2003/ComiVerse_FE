import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/common/AuthPage'
import AccountManagement from './pages/common/admin/AccountManagement'
import BroadcastManagement from './pages/common/admin/BroadcastManagement'
import StatisticsDashboard from './pages/common/admin/StatisticsDashboard'
import RevenueManagement from './pages/common/admin/RevenueManagement'
import PayoutManagement from './pages/common/admin/PayoutManagement'
import AuthorDashboard from './pages/author/AuthorDashboard'
import AuthorComics from './pages/author/AuthorComics'
import AuthorComicDetail from './pages/author/AuthorComicDetail'
import AuthorEarnings from './pages/author/AuthorEarnings'
import AuthorSettings from './pages/author/AuthorSettings'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<AuthPage />} />
        {/* Admin */}
        <Route path="/admin/statistics" element={<StatisticsDashboard />} />
        <Route path="/admin/revenue" element={<RevenueManagement />} />
        <Route path="/admin/account-management" element={<AccountManagement />} />
        <Route path="/admin/broadcast" element={<BroadcastManagement />} />
        <Route path="/admin/payout" element={<PayoutManagement />} />
      {/* Author */}
        <Route path="/author/overview" element={<AuthorDashboard />} />
        <Route path="/author/comics" element={<AuthorComics />} />
        <Route path="/author/comics/:id" element={<AuthorComicDetail />} />
        <Route path="/author/earnings" element={<AuthorEarnings />} />
        <Route path="/author/settings" element={<AuthorSettings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

