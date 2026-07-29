import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getAuth, setAuth, clearAuth } from '../utils/Auth'
import { getMySubscriptionApi } from '../services/api/SubscriptionApi'
import stompService from '../services/websocket/StompService'

const AuthContext = createContext()

function normalizeRole(user) {
  const role = typeof user?.role === 'string'
    ? user.role
    : (user?.role?.roleName || user?.roleName || '')
  return String(role).trim().toUpperCase()
}

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const auth = getAuth()
    return {
      token: auth?.token || null,
      user: auth?.user || null,
      isLoggedIn: !!auth?.token
    }
  })

  const login = (token, user, refreshToken) => {
    setAuth(token, user, refreshToken)
    setAuthState({
      token,
      user,
      isLoggedIn: true
    })
  }

  const logout = () => {
    clearAuth()
    setAuthState({
      token: null,
      user: null,
      isLoggedIn: false
    })
  }

  const updateUser = (updatedUser) => {
    const token = localStorage.getItem('token')
    const refreshToken = localStorage.getItem('refreshToken')
    setAuth(token, updatedUser, refreshToken)
    setAuthState(prev => ({
      ...prev,
      user: updatedUser
    }))
  }

  const refreshSubscription = useCallback(async () => {
    const auth = getAuth()
    const currentUser = auth?.user
    if (!auth?.token || !currentUser || normalizeRole(currentUser) !== 'READER') {
      return null
    }

    const subscription = await getMySubscriptionApi({ suppressToast: true })

    // Accounts upgraded before Stripe subscriptions were introduced may not have
    // a reader_subscriptions row yet. Keep their server-issued user cache intact.
    if (!subscription) {
      return {
        premiumActive: Boolean(currentUser.premiumActive),
        planCode: currentUser.premiumPlan || null,
        currentPeriodEnd: currentUser.premiumExpiresAt || null,
        legacy: true
      }
    }

    const premiumActive = Boolean(subscription.premiumActive)
    const nextUser = {
      ...currentUser,
      premiumActive,
      premiumPlan: premiumActive ? subscription.planCode : null,
      premiumExpiresAt: premiumActive ? subscription.currentPeriodEnd : null
    }
    const refreshToken = localStorage.getItem('refreshToken')
    setAuth(auth.token, nextUser, refreshToken)
    setAuthState(prev => ({
      ...prev,
      token: auth.token,
      user: nextUser,
      isLoggedIn: true
    }))
    return subscription
  }, [])

  useEffect(() => {
    if (authState.isLoggedIn && authState.token) {
      stompService.connect()
    }
  }, [authState.isLoggedIn, authState.token])

  useEffect(() => {
    if (
      authState.isLoggedIn
      && authState.token
      && normalizeRole(authState.user) === 'READER'
    ) {
      refreshSubscription().catch(error => {
        console.warn('Unable to refresh subscription state:', error?.message || error)
      })
    }
  }, [authState.isLoggedIn, authState.token, authState.user?.role, authState.user?.roleName, refreshSubscription])

  return (
    <AuthContext.Provider value={{
      token: authState.token,
      user: authState.user,
      isLoggedIn: authState.isLoggedIn,
      login,
      logout,
      updateUser,
      refreshSubscription
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
