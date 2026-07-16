import AuthorLayout from '../../components/layout/AuthorLayout'
import '../../assets/style/author/earnings.css'
function AuthorEarnings() {
  const chartData = [
    { month: 'Jan', amount: '2.1M', pct: '35%' },
    { month: 'Feb', amount: '3.4M', pct: '55%' },
    { month: 'Mar', amount: '4.8M', pct: '75%' },
    { month: 'Apr', amount: '5.2M', pct: '80%' },
    { month: 'May', amount: '6.1M', pct: '90%' },
    { month: 'Jun', amount: '6.7M', pct: '100%' },
  ]
  const payouts = [
    { date: 'Jun 15, 2026', amount: '6.1M', status: 'completed', method: 'Direct Deposit (**** 4321)' },
    { date: 'May 15, 2026', amount: '5.2M', status: 'completed', method: 'Direct Deposit (**** 4321)' },
    { date: 'Apr 15, 2026', amount: '4.8M', status: 'completed', method: 'Direct Deposit (**** 4321)' },
    { date: 'Mar 15, 2026', amount: '3.4M', status: 'completed', method: 'Direct Deposit (**** 4321)' },
  ]
  return (
    <AuthorLayout activeNav="earnings">
      <div className="author-page-header">
        <h1>Earnings & Revenue</h1>
        <p>Track your monthly revenue stats, check payout trends, and view transaction records.</p>
      </div>
      <div className="earnings-container">
        {/* Left column: Trend chart & Payout History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Trend Chart */}
          <div className="author-section-card">
            <h2 className="author-section-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Monthly Revenue Trend
            </h2>
            <div className="earnings-trend-chart-wrapper">
              {chartData.map((data, idx) => (
                <div className="chart-bar-col" key={idx}>
                  <div 
                    className="chart-bar-fill" 
                    style={{ height: data.pct }}
                  >
                    <span className="chart-bar-tooltip">{data.amount}</span>
                  </div>
                  <span className="chart-bar-label">{data.month}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Payout History Table */}
          <div className="author-section-card">
            <h2 className="author-section-title">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Payout History
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="table-premium">
                <thead>
                  <tr>
                    <th>Payout Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout, idx) => (
                    <tr key={idx}>
                      <td>{payout.date}</td>
                      <td style={{ fontWeight: '600' }}>{payout.amount} VND</td>
                      <td className="author-cell-muted">{payout.method}</td>
                      <td>
                        <span className={`badge-status-payout ${payout.status}`}>
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* Right column: Summary Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="author-section-card" style={{ height: 'fit-content' }}>
            <h2 className="author-section-title">Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span className="author-summary-label" style={{ fontSize: '13px', display: 'block' }}>Next Estimated Payout</span>
                <span className="author-summary-value" style={{ fontSize: '24px', fontWeight: '700' }}>6,700,000 VND</span>
                <span className="author-summary-muted" style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>Scheduled for July 15, 2026</span>
              </div>
              
              <div className="author-summary-block">
                <span className="author-summary-label" style={{ fontSize: '13px', display: 'block' }}>Lifetime Earnings</span>
                <span className="author-summary-value" style={{ fontSize: '20px', fontWeight: '600' }}>28,300,000 VND</span>
              </div>
              <div className="author-summary-block">
                <span className="author-summary-label" style={{ fontSize: '13px', display: 'block' }}>Payout Account</span>
                <span className="author-summary-value" style={{ fontSize: '14px', fontWeight: '500', display: 'block', marginTop: '4px' }}>MB Bank</span>
                <span className="author-summary-label" style={{ fontSize: '12px' }}>Acc Name: NGUYEN VAN A</span>
                <span className="author-summary-label" style={{ fontSize: '12px', display: 'block' }}>Acc No: **** 4321</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthorLayout>
  )
}
export default AuthorEarnings