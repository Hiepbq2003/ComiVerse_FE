import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/common/AuthPage'
import AccountManagement from './pages/admin/AccountManagement'
import BroadcastManagement from './pages/admin/BroadcastManagement'
import StatisticsDashboard from './pages/admin/StatisticsDashboard'
import RevenueManagement from './pages/admin/RevenueManagement'
import PayoutManagement from './pages/admin/PayoutManagement'
import AuthorDashboard from './pages/author/AuthorDashboard'
import AuthorComics from './pages/author/AuthorComics'
import AuthorEarnings from './pages/author/AuthorEarnings'
import AuthorSettings from './pages/author/AuthorSettings'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<AuthPage />} />
        <Route path="/oauth2/redirect" element={<AuthPage />} />
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

