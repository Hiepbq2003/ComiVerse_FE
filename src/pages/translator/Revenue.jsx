import '../../assets/style/translator/revenue.css'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CreatorRevenuePanel from '../../components/payout/CreatorRevenuePanel'

function Revenue() {
  const { user } = useAuth()
  const roleUpper = (user?.role || '').toUpperCase().replace(/[\s-]+/g, '_')

  if (roleUpper !== 'TRANSLATOR') {
    return <Navigate to="/translator/dashboard" replace />
  }

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Revenue Management</h1>
          <p>Each completed team task assigned through assignee_id earns the configured task rate.</p>
        </div>
      </div>
      <CreatorRevenuePanel heading="Translator Monthly Revenue" />
    </div>
  )
}

export default Revenue
