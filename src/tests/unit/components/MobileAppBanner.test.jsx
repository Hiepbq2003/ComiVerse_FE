import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import MobileAppBanner from '../../../components/common/MobileAppBanner'
import {
  MOBILE_APP_BANNER_DELAY_MS,
  MOBILE_APP_BANNER_DISMISS_MS,
  MOBILE_APP_BANNER_STORAGE_KEY,
  canShowMobileAppBanner,
  detectMobilePlatform,
} from '../../../utils/mobileAppBanner'

function setUserAgent(userAgent, platform = '') {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function renderBanner(pathname = '/') {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <MobileAppBanner />
    </MemoryRouter>,
  )
}

describe('MobileAppBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Win32')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('does not render on desktop devices', () => {
    renderBanner()
    act(() => vi.advanceTimersByTime(MOBILE_APP_BANNER_DELAY_MS + 1))

    expect(screen.queryByLabelText('ComiVerse mobile application')).not.toBeInTheDocument()
  })

  it('shows the Android APK action after the delay', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36', 'Linux armv8l')
    renderBanner()

    act(() => vi.advanceTimersByTime(MOBILE_APP_BANNER_DELAY_MS + 1))

    const action = screen.getByRole('link', { name: /tải cho android/i })
    expect(action).toHaveAttribute('href', expect.stringMatching(/\.apk$/))
    expect(screen.getByText('ComiVerse tốt hơn trên ứng dụng')).toBeInTheDocument()
  })

  it('uses the iOS guide and reader-specific copy on a chapter page', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone')
    renderBanner('/comic/1/chapter/2')

    act(() => vi.advanceTimersByTime(MOBILE_APP_BANNER_DELAY_MS + 1))

    expect(screen.getByRole('link', { name: /cài trên iphone/i })).toHaveAttribute('href', '/download/ios')
    expect(screen.getByText('Đọc truyện thoải mái hơn với ComiVerse App')).toBeInTheDocument()
  })

  it('remembers a dismissal and allows the banner again after seven days', () => {
    setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 'Linux armv8l')
    renderBanner()
    act(() => vi.advanceTimersByTime(MOBILE_APP_BANNER_DELAY_MS + 1))

    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))
    const dismissedAt = Number(window.localStorage.getItem(MOBILE_APP_BANNER_STORAGE_KEY))

    expect(dismissedAt).toBeGreaterThan(0)
    expect(canShowMobileAppBanner(window.localStorage, dismissedAt + MOBILE_APP_BANNER_DISMISS_MS - 1)).toBe(false)
    expect(canShowMobileAppBanner(window.localStorage, dismissedAt + MOBILE_APP_BANNER_DISMISS_MS)).toBe(true)
  })

  it('detects Android and iOS without treating a resized desktop as mobile', () => {
    expect(detectMobilePlatform({ userAgent: 'Android', platform: 'Linux' })).toBe('android')
    expect(detectMobilePlatform({ userAgent: 'iPad', platform: 'iPad' })).toBe('ios')
    expect(detectMobilePlatform({ userAgent: 'Windows', platform: 'Win32' })).toBeNull()
  })
})
