import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { useAuth } from '../../context/AuthContext'
import { getCheckoutStatusApi } from '../../services/api/SubscriptionApi'
import '../../assets/style/reader/subscription.css'

const TERMINAL_STATUSES = new Set(['PAID', 'FAILED', 'EXPIRED', 'REFUNDED'])

function SubscriptionResult({ cancelled = false }) {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { user, updateUser } = useAuth()
  const [status, setStatus] = useState(cancelled ? 'CANCELLED' : 'PENDING')
  const [details, setDetails] = useState(null)
  const userRef = useRef(user)
  const updateUserRef = useRef(updateUser)
  const authUpdatedRef = useRef(false)

  useEffect(() => {
    userRef.current = user
    updateUserRef.current = updateUser
  }, [user, updateUser])

  useEffect(() => {
    if (cancelled || !sessionId) return undefined
    let active = true
    let attempts = 0
    let timer

    const poll = async () => {
      try {
        const data = await getCheckoutStatusApi(sessionId)
        if (!active) return
        setDetails(data)
        setStatus(data?.paymentStatus || 'PENDING')
        if (data?.premiumActive && userRef.current && !authUpdatedRef.current) {
          authUpdatedRef.current = true
          updateUserRef.current({
            ...userRef.current,
            premiumActive: true,
            premiumPlan: data.planCode,
            premiumExpiresAt: data.premiumExpiresAt
          })
        }
        if (!TERMINAL_STATUSES.has(data?.paymentStatus) && attempts < 8) {
          attempts += 1
          timer = window.setTimeout(poll, 1500)
        }
      } catch (error) {
        console.error(error)
        if (active && attempts < 5) {
          attempts += 1
          timer = window.setTimeout(poll, 1800)
        } else if (active) {
          setStatus('UNKNOWN')
        }
      }
    }

    poll()
    return () => {
      active = false
      if (timer) window.clearTimeout(timer)
    }
  }, [cancelled, sessionId])

  const isPaid = status === 'PAID'
  const isFailed = ['FAILED', 'EXPIRED', 'UNKNOWN'].includes(status)
  const Icon = cancelled || isFailed ? XCircle : (isPaid ? CheckCircle2 : Clock3)

  return (
    <HomeLayout>
      <section className="subscription-result-page">
        <div className={`subscription-result-card ${isPaid ? 'success' : ''} ${(cancelled || isFailed) ? 'cancelled' : ''}`}>
          <span className="subscription-result-icon"><Icon size={54} /></span>
          <h1>
            {cancelled
              ? 'Checkout cancelled'
              : isPaid
                ? 'Premium activated'
                : isFailed
                  ? 'Payment was not completed'
                  : 'Confirming your payment'}
          </h1>
          <p>
            {cancelled
              ? 'No charge was made. You can return to the plans and choose again.'
              : isPaid
                ? `${details?.planName || 'Your subscription'} is now active.`
                : isFailed
                  ? 'The transaction could not be confirmed. Review the payment status or try a new checkout.'
                  : 'Stripe has redirected you successfully. ComiVerse is waiting for the signed webhook before granting access.'}
          </p>
          {details?.premiumExpiresAt && isPaid && (
            <div className="subscription-result-meta">
              Current period ends: {new Date(details.premiumExpiresAt).toLocaleString()}
            </div>
          )}
          <div className="subscription-result-actions">
            <Link to="/" className="subscription-result-primary">Back to Home</Link>
            {!isPaid && <Link to="/profile" className="subscription-result-secondary">View Account</Link>}
          </div>
        </div>
      </section>
    </HomeLayout>
  )
}

export default SubscriptionResult
