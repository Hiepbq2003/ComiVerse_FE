function Payout() {
  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Payout Management</h1>
          <p>Request payout settlements or manage your linked banking credentials.</p>
        </div>
      </div>

      <div className="placeholder-grid" style={{ marginBottom: '24px' }}>
        <div className="placeholder-card">
          <h4>Request Payout</h4>
          <p style={{ margin: '10px 0' }}>Minimum payout threshold: $50.00. Current clear balance: <strong>$84.50</strong>.</p>
          <button className="trans-btn primary" onClick={() => alert('Payout request submitted successfully!')}>
            Submit Request
          </button>
        </div>

        <div className="placeholder-card">
          <h4>Linked Banking Details</h4>
          <div style={{ marginTop: '10px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div><strong>Bank:</strong> Vietcombank (VCB)</div>
            <div><strong>Account Holder:</strong> NGUYEN VAN A</div>
            <div><strong>Account Number:</strong> 10123456789</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payout
