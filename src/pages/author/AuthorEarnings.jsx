import '../../assets/style/author/earnings.css'
import CreatorPayoutPanel from '../../components/payout/CreatorPayoutPanel'
import CreatorRevenuePanel from '../../components/payout/CreatorRevenuePanel'

function AuthorEarnings() {
  return (
    <>
      <div className="author-page-header">
        <h1>Earnings & Revenue</h1>
        <p>Revenue is calculated per comic from monthly views and new follows. Request a closed-month payout through Stripe sandbox.</p>
      </div>

      <CreatorRevenuePanel heading="Author Monthly Revenue" />
      <div style={{ height: '24px' }} />
      <CreatorPayoutPanel heading="Author Monthly Payout" />
    </>
  )
}

export default AuthorEarnings
