function Profile({ user, onLogout }) {
  return (
    <div className="profile-dashboard-card fade-in">
      <div className="user-avatar-placeholder">
        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
      </div>
      <h2>Welcome, {user.fullName}!</h2>
      <p className="profile-subtitle">You are successfully logged in.</p>
      
      <div className="user-details-grid">
        <div className="detail-item">
          <span className="detail-label">Username</span>
          <span className="detail-value">{user.username}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Email Address</span>
          <span className="detail-value">{user.email}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Role Access</span>
          <span className="detail-value role-badge">{user.role}</span>
        </div>
      </div>

      <button className="btn-primary logout-btn" onClick={onLogout}>
        Sign Out
      </button>
    </div>
  )
}

export default Profile
