import { useEffect, useMemo, useState } from 'react'
import { Check, Crown, ShieldCheck, Star, X, Zap } from 'lucide-react'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  createBillingPortalApi,
  createCheckoutSessionApi,
  getSubscriptionPlansApi
} from '../../services/api/SubscriptionApi'
import '../../assets/style/reader/subscription.css'

const FREE_FEATURES = [
  { label: 'Read free comics', enabled: true },
  { label: 'Ads shown', enabled: false },
  { label: 'Premium-only titles', enabled: false },
  { label: 'Offline reading', enabled: false },
  { label: 'HD quality', enabled: false },
  { label: 'Unlimited chapters/day', enabled: false }
]

function formatPrice(value, currency = 'VND') {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2
    }).format(amount)
  } catch {
    return `${amount.toLocaleString()} ${currency}`
  }
}

function intervalLabel(plan) {
  const count = Number(plan.intervalCount || 1)
  const unit = plan.billingInterval === 'YEAR' ? 'year' : 'month'
  return count === 1 ? `per ${unit}` : `every ${count} ${unit}s`
}

function SubscriptionPlanModal({ open, onClose }) {
  const navigate = useNavigate()
  const { isLoggedIn, user, refreshSubscription } = useAuth()
  const rawRole = typeof user?.role === 'string' ? user.role : (user?.role?.roleName || user?.roleName || '')
  const isReader = String(rawRole).trim().toUpperCase() === 'READER'
  const [plans, setPlans] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(false)
  const [processingPlanId, setProcessingPlanId] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const currentPlanId = subscription?.premiumActive ? subscription.planId : null
  const hasActiveSubscription = Boolean(subscription?.premiumActive)
  const existingStatus = String(subscription?.status || '').toUpperCase()
  const requiresBillingManagement = Boolean(
    subscription?.id
      && ['ACTIVE', 'TRIALING', 'PAST_DUE', 'UNPAID', 'PAUSED', 'INCOMPLETE'].includes(existingStatus)
  )
  const canManageSubscription = Boolean(subscription?.id)

  useEffect(() => {
    if (!open) return undefined

    let mounted = true
    const loadPlans = async () => {
      setLoading(true)
      try {
        const [plansResult, subscriptionResult] = await Promise.allSettled([
          getSubscriptionPlansApi(),
          isLoggedIn && isReader ? refreshSubscription() : Promise.resolve(null)
        ])
        if (!mounted) return
        setPlans(plansResult.status === 'fulfilled' && Array.isArray(plansResult.value) ? plansResult.value : [])
        setSubscription(subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null)
      } catch (error) {
        console.error(error)
        if (mounted) toast.error('Unable to load subscription plans.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPlans()
    const handleEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.classList.add('subscription-modal-open')
    return () => {
      mounted = false
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('subscription-modal-open')
    }
  }, [open, isLoggedIn, isReader, onClose, refreshSubscription])

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0)),
    [plans]
  )

  const handleCheckout = async (plan) => {
    if (!isLoggedIn) {
      onClose()
      navigate('/auth?mode=signin')
      return
    }
    if (!isReader) {
      toast.info('Reader Premium subscriptions are available to READER accounts only.')
      return
    }
    try {
      setProcessingPlanId(plan.id)
      const checkout = await createCheckoutSessionApi(plan.id)
      if (!checkout?.checkoutUrl) throw new Error('Missing Stripe checkout URL')
      window.location.assign(checkout.checkoutUrl)
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Unable to open Stripe sandbox checkout.')
      setProcessingPlanId(null)
    }
  }

  const handleManageSubscription = async () => {
    try {
      setPortalLoading(true)
      const portal = await createBillingPortalApi()
      if (!portal?.portalUrl) throw new Error('Missing Stripe portal URL')
      window.location.assign(portal.portalUrl)
    } catch (error) {
      console.error(error)
      toast.error(error.response?.data?.message || 'Unable to open subscription management.')
      setPortalLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="subscription-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="subscription-modal-panel">
        <header className="subscription-modal-header">
          <div>
            <h2 id="subscription-modal-title">ComiVerse Plans</h2>
            <p>Choose the plan that fits your reading needs</p>
          </div>
          <button type="button" className="subscription-modal-close" onClick={onClose} aria-label="Close plans">
            <X size={22} />
          </button>
        </header>

        <div className="subscription-modal-body">
          {loading ? (
            <div className="subscription-loading-state">
              <span className="subscription-spinner" />
              Loading plans...
            </div>
          ) : (
            <div className="subscription-plan-grid">
              <article className={`subscription-plan-card ${!hasActiveSubscription ? 'current' : ''}`}>
                <div className="subscription-card-badge-row">
                  {!hasActiveSubscription && <span className="subscription-card-badge">Current Plan</span>}
                </div>
                <div className="subscription-card-title-row">
                  <span className="subscription-plan-icon"><Zap size={21} /></span>
                  <h3>Free</h3>
                </div>
                <div className="subscription-plan-price">0 VND</div>
                <p className="subscription-plan-period">forever</p>
                <div className="subscription-plan-divider" />
                <ul className="subscription-feature-list">
                  {FREE_FEATURES.map((feature) => (
                    <li key={feature.label} className={!feature.enabled ? 'disabled' : ''}>
                      <span className="subscription-feature-icon">{feature.enabled ? <Check size={14} /> : <X size={13} />}</span>
                      {feature.label}
                    </li>
                  ))}
                </ul>
                <button type="button" className="subscription-plan-button secondary" disabled>
                  {!hasActiveSubscription ? 'Current Plan' : 'Free Plan'}
                </button>
              </article>

              {sortedPlans.map((plan) => {
                const isCurrent = currentPlanId === plan.id
                const isProcessing = processingPlanId === plan.id
                const Icon = plan.billingInterval === 'YEAR' ? Star : Crown
                return (
                  <article
                    key={plan.id}
                    className={`subscription-plan-card ${plan.recommended ? 'recommended' : ''} ${isCurrent ? 'current' : ''}`}
                  >
                    <div className="subscription-card-badge-row">
                      {(plan.badge || plan.recommended || isCurrent) && (
                        <span className="subscription-card-badge">
                          {isCurrent ? 'Current Plan' : (plan.badge || (plan.recommended ? 'Most Popular' : ''))}
                        </span>
                      )}
                    </div>
                    <div className="subscription-card-title-row">
                      <span className="subscription-plan-icon"><Icon size={21} /></span>
                      <h3>{plan.name}</h3>
                    </div>
                    <div className="subscription-plan-price">{formatPrice(plan.price, plan.currency)}</div>
                    <p className="subscription-plan-period">{intervalLabel(plan)}</p>
                    <div className="subscription-plan-divider" />
                    <ul className="subscription-feature-list">
                      {(plan.features || []).map((feature) => (
                        <li key={feature}>
                          <span className="subscription-feature-icon"><Check size={14} /></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <button
                        type="button"
                        className="subscription-plan-button"
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                      >
                        {portalLoading ? 'Opening...' : 'Manage Subscription'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="subscription-plan-button"
                        onClick={() => handleCheckout(plan)}
                        disabled={Boolean(processingPlanId) || requiresBillingManagement}
                        title={requiresBillingManagement ? 'Manage your existing Stripe subscription before choosing another plan.' : ''}
                      >
                        {isProcessing
                          ? 'Opening Stripe...'
                          : requiresBillingManagement
                            ? 'Manage Billing First'
                            : `Choose ${plan.name}`}
                      </button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <footer className="subscription-modal-footer">
          <div className="subscription-modal-footer-note">
            <ShieldCheck size={16} />
            Secure sandbox checkout by Stripe. Access is activated only after a verified webhook confirms payment.
          </div>
          {canManageSubscription && (
            <button
              type="button"
              className="subscription-footer-manage-button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
            >
              {portalLoading ? 'Opening...' : 'Manage Subscription'}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}

export default SubscriptionPlanModal
