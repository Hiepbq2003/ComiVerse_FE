import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import HomeLayout from '../../components/layout/HomeLayout'
import { useAuth } from '../../context/AuthContext'
import { getCheckoutStatusApi } from '../../services/api/SubscriptionApi'
import '../../assets/style/reader/subscription.css'

const FAILED_TERMINAL_STATUSES = new Set(['FAILED', 'EXPIRED', 'REFUNDED'])

function SubscriptionResult({ cancelled = false }) {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const { refreshSubscription } = useAuth()
  const [status, setStatus] = useState(cancelled ? 'CANCELLED' : 'PENDING')
  const [details, setDetails] = useState(null)
  const subscriptionSyncedRef = useRef(false)

  useEffect(() => {
    if (cancelled || !sessionId) return undefined
    let active = true
    let attempts = 0
    let timer

    const scheduleNextPoll = (delay = 1500) => {
      if (!active) return
      if (attempts >= 12) return
      attempts += 1
      timer = window.setTimeout(poll, delay)
    }

    const poll = async () => {
      try {
        const data = await getCheckoutStatusApi(sessionId)
        if (!active) return

        const paymentStatus = data?.paymentStatus || 'PENDING'
        setDetails(data)
        setStatus(paymentStatus)

        if (paymentStatus === 'PAID' && data?.premiumActive) {
          if (!subscriptionSyncedRef.current) {
            subscriptionSyncedRef.current = true
            try {
              await refreshSubscription()
            } catch (error) {
              console.warn('Payment succeeded but account refresh failed:', error?.message || error)
            }
          }
          return
        }

        if (FAILED_TERMINAL_STATUSES.has(paymentStatus)) return

        // PAID is not terminal until the local subscription row and premium cache
        // have also been synchronized. This covers delayed Stripe webhooks safely.
        scheduleNextPoll()
      } catch (error) {
        console.error(error)
        if (attempts < 5) {
          scheduleNextPoll(1800)
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
  }, [cancelled, sessionId, refreshSubscription])

  const isActivated = status === 'PAID' && Boolean(details?.premiumActive)
  const isActivationPending = status === 'PAID' && !details?.premiumActive
  const isFailed = ['FAILED', 'EXPIRED', 'REFUNDED', 'UNKNOWN'].includes(status)
  const Icon = cancelled || isFailed ? XCircle : (isActivated ? CheckCircle2 : Clock3)

  return (
    <HomeLayout>
      <section className="subscription-result-page">
        <div className={`subscription-result-card ${isActivated ? 'success' : ''} ${(cancelled || isFailed) ? 'cancelled' : ''}`}>
          <span className="subscription-result-icon"><Icon size={54} /></span>
          <h1>
            {cancelled
              ? 'Checkout cancelled'
              : isActivated
                ? 'Premium activated'
                : isActivationPending
                  ? 'Payment received'
                  : isFailed
                    ? 'Payment was not completed'
                    : 'Confirming your payment'}
          </h1>
          <p>
            {cancelled
              ? 'No charge was made. You can return to the plans and choose again.'
              : isActivated
                ? `${details?.planName || 'Your subscription'} is now active.`
                : isActivationPending
                  ? 'Stripe confirmed the payment. ComiVerse is synchronizing your subscription and premium access.'
                  : isFailed
                    ? 'The transaction could not be confirmed. Review the payment status or try a new checkout.'
                    : 'Stripe redirected you successfully. ComiVerse is verifying the signed payment event.'}
          </p>
          {details?.premiumExpiresAt && isActivated && (
            <div className="subscription-result-meta">
              Current period ends: {new Date(details.premiumExpiresAt).toLocaleString()}
            </div>
          )}
          <div className="subscription-result-actions">
            <Link to="/" className="subscription-result-primary">Back to Home</Link>
            {!isActivated && <Link to="/profile" className="subscription-result-secondary">View Account</Link>}
          </div>
        </div>
      </section>
    </HomeLayout>
  )
}

export default SubscriptionResult
