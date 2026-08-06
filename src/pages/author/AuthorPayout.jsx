import '../../assets/style/author/earnings.css'
import CreatorPayoutPanel from '../../components/payout/CreatorPayoutPanel'

function AuthorPayout() {
  return <div className="creator-finance-page"><div className="author-page-header"><span className="creator-page-eyebrow">Payments</span><h1>Payout</h1><p>Set up your Stripe payout method, request payment for a closed month, and follow every transfer status.</p></div><CreatorPayoutPanel heading="Author payout" /></div>
}

export default AuthorPayout
