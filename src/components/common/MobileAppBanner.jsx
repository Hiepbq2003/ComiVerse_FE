import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Download, Smartphone, X } from 'lucide-react'
import {
  COMIVERSE_ANDROID_URL,
  COMIVERSE_IOS_GUIDE_PATH,
} from '../../constants/mobileApp'
import {
  MOBILE_APP_BANNER_DELAY_MS,
  MOBILE_APP_BANNER_STORAGE_KEY,
  canShowMobileAppBanner,
  detectMobilePlatform,
} from '../../utils/mobileAppBanner'
import '../../assets/style/common/mobile-app-banner.css'

function MobileAppBanner() {
  const location = useLocation()
  const [isVisible, setIsVisible] = useState(false)
  const platform = useMemo(() => detectMobilePlatform(), [])
  const isReading =
    /^\/comic\/[^/]+\/chapter\/[^/]+/.test(location.pathname) ||
    /^\/chapters\/[^/]+/.test(location.pathname)

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true

    if (
      !platform ||
      isStandalone ||
      location.pathname === COMIVERSE_IOS_GUIDE_PATH ||
      !canShowMobileAppBanner()
    ) {
      return undefined
    }

    let revealed = false
    const reveal = () => {
      if (revealed) return
      revealed = true
      setIsVisible(true)
      window.removeEventListener('scroll', handleScroll)
    }
    const handleScroll = () => {
      if (window.scrollY >= 120) reveal()
    }
    const timer = window.setTimeout(reveal, MOBILE_APP_BANNER_DELAY_MS)

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [location.pathname, platform])

  const dismiss = () => {
    setIsVisible(false)
    try {
      window.localStorage.setItem(MOBILE_APP_BANNER_STORAGE_KEY, String(Date.now()))
    } catch {
      // The banner can still be dismissed for the current page when storage is blocked.
    }
  }

  if (!isVisible || !platform) return null

  const title = isReading
    ? 'Enjoy a better reading experience on the ComiVerse App'
    : 'ComiVerse is better on the app'
  const description = isReading
    ? 'Download chapters to read offline and resume right where you left off.'
    : 'Read smoothly, download chapters offline, and get notified.'
  const actionLabel = platform === 'android' ? 'Download for Android' : 'Install on iPhone'

  return (
    <aside
      className={`mobile-app-banner ${isReading ? 'mobile-app-banner--reader' : ''}`}
      aria-label="ComiVerse mobile application"
      aria-live="polite"
    >
      <button
        type="button"
        className="mobile-app-banner__close"
        onClick={dismiss}
        aria-label="Dismiss app download banner"
      >
        <X size={18} />
      </button>

      <span className="mobile-app-banner__icon" aria-hidden="true">
        <Smartphone size={22} />
      </span>

      <div className="mobile-app-banner__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <div className="mobile-app-banner__actions">
        {platform === 'android' ? (
          <a
            className="mobile-app-banner__download"
            href={COMIVERSE_ANDROID_URL}
            target="_blank"
            rel="noopener noreferrer"
            download="comiverse-latest.apk"
            onClick={dismiss}
          >
            <Download size={17} />
            <span>{actionLabel}</span>
          </a>
        ) : (
          <Link
            className="mobile-app-banner__download"
            to={COMIVERSE_IOS_GUIDE_PATH}
            onClick={dismiss}
          >
            <Download size={17} />
            <span>{actionLabel}</span>
          </Link>
        )}
        <button type="button" className="mobile-app-banner__later" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  )
}

export default MobileAppBanner
