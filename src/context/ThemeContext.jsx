import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { getAuth } from '../utils/Auth'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const { user } = useAuth()

  const getThemeKey = (u) => {
    if (!u) return 'theme'
    const identifier = u.userId || u.id || u.email || u.username
    return identifier ? `theme_${identifier}` : 'theme'
  }

  const [theme, setTheme] = useState(() => {
    const auth = getAuth()
    const key = getThemeKey(auth?.user)
    return localStorage.getItem(key) || 'dark'
  })

  useEffect(() => {
    const key = getThemeKey(user)
    const savedTheme = localStorage.getItem(key) || 'dark'
    setTheme(savedTheme)
  }, [user])

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }
    const key = getThemeKey(user)
    localStorage.setItem(key, theme)
  }, [theme, user])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
