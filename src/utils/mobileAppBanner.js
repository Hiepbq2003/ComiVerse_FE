export const MOBILE_APP_BANNER_STORAGE_KEY = 'comiverseAppBannerDismissedAt'
export const MOBILE_APP_BANNER_DISMISS_MS = 7 * 24 * 60 * 60 * 1000
export const MOBILE_APP_BANNER_DELAY_MS = 3000

export function detectMobilePlatform(navigatorLike = window.navigator) {
  const userAgent = navigatorLike?.userAgent || ''
  const platform = navigatorLike?.platform || ''
  const isIPad = platform === 'MacIntel' && Number(navigatorLike?.maxTouchPoints) > 1

  if (/Android/i.test(userAgent)) return 'android'
  if (/iPhone|iPad|iPod/i.test(userAgent) || isIPad) return 'ios'
  return null
}

export function canShowMobileAppBanner(storage = window.localStorage, now = Date.now()) {
  try {
    const dismissedAt = Number(storage.getItem(MOBILE_APP_BANNER_STORAGE_KEY))
    return !dismissedAt || now - dismissedAt >= MOBILE_APP_BANNER_DISMISS_MS
  } catch {
    return true
  }
}
