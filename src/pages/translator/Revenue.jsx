import '../../assets/style/translator/revenue.css'

function Revenue() {
  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Revenue Management</h1>
          <p>Monitor your ad-revenue split allocations, views bonuses, and check pending payouts.</p>
        </div>
      </div>

      <div className="trans-stats-grid">
        <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-green)' }}>
          <h4>Cumulative Revenue</h4>
          <div className="val">$1,280.00</div>
          <div className="sub">All-time earnings on ComiVerse</div>
        </div>
        <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-purple)' }}>
          <h4>Translation Views</h4>
          <div className="val">142,500</div>
          <div className="sub">Total clicks on translated chapters</div>
        </div>
        <div className="trans-stat-card" style={{ borderTop: '4px solid var(--trans-purple)' }}>
          <h4>Pending Clearance</h4>
          <div className="val">$84.50</div>
          <div className="sub">To be credited next month</div>
        </div>
      </div>

      <div className="trans-project-card" style={{ display: 'block', padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px' }}>Monthly View Earnings Breakdown</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--trans-border)', textAlign: 'left' }}>
              <th style={{ padding: '10px 0' }}>Period</th>
              <th>Translated Views</th>
              <th>Revenue Share</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--trans-border)' }}>
              <td style={{ padding: '12px 0' }}>June 2026</td>
              <td>42,000 views</td>
              <td>$84.50</td>
              <td><span className="status-badge paused">Cleared</span></td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--trans-border)' }}>
              <td style={{ padding: '12px 0' }}>May 2026</td>
              <td>55,000 views</td>
              <td>$110.00</td>
              <td><span className="status-badge active">Paid</span></td>
            </tr>
            <tr>
              <td style={{ padding: '12px 0' }}>April 2026</td>
              <td>45,500 views</td>
              <td>$91.00</td>
              <td><span className="status-badge active">Paid</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Revenue
