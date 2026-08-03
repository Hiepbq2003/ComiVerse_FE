import '../../assets/style/translator/payout.css'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import CreatorPayoutPanel from '../../components/payout/CreatorPayoutPanel'

function Payout() {
  const { user } = useAuth()
  const roleUpper = (user?.role || '').toUpperCase().replace(/[\s-]+/g, '_')

  if (roleUpper !== 'TRANSLATOR') {
    return <Navigate to="/translator/dashboard" replace />
  }

  return (
    <div className="fade-in">
      <div className="translator-page-header">
        <div className="translator-page-header-info">
          <h1>Payout Management</h1>
          <p>Request payment for completed team tasks assigned to you in a closed month through Stripe sandbox.</p>
        </div>
      </div>
      <CreatorPayoutPanel heading="Translator Monthly Payout" />
    </div>
  )
}

export default Payout
