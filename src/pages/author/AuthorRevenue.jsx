import '../../assets/style/author/earnings.css'
import CreatorRevenuePanel from '../../components/payout/CreatorRevenuePanel'

function AuthorRevenue() {
  return <div className="creator-finance-page"><div className="author-page-header"><span className="creator-page-eyebrow">Financial overview</span><h1>Revenue</h1><p>Track monthly revenue from comic views and new followers, including the amount available after the monthly cap.</p></div><CreatorRevenuePanel heading="Author revenue" /></div>
}

export default AuthorRevenue
