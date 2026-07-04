import { createContext, useContext, useState } from 'react'
import { getAuth, setAuth, clearAuth } from '../utils/Auth'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    const auth = getAuth()
    return {
      token: auth?.token || null,
      user: auth?.user || null,
      isLoggedIn: !!auth?.token
    }
  })

  const login = (token, user) => {
    setAuth(token, user)
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

  return (
    <AuthContext.Provider value={{
      token: authState.token,
      user: authState.user,
      isLoggedIn: authState.isLoggedIn,
      login,
      logout,
      updateUser
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
