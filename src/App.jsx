import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthPage from './pages/common/AuthPage'
import AccountManagement from './pages/common/admin/AccountManagement'
import BroadcastManagement from './pages/common/admin/BroadcastManagement'
import StatisticsDashboard from './pages/common/admin/StatisticsDashboard'
import RevenueManagement from './pages/common/admin/RevenueManagement'
import PayoutManagement from './pages/common/admin/PayoutManagement'

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
      </Routes>
    </BrowserRouter>
  )
}

export default App

