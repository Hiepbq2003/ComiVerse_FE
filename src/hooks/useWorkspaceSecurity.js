import { useEffect } from 'react'

function useWorkspaceSecurity({ targetElementId = 'secure-workspace', onDevToolsOpen, disableDetector = false } = {}) {
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault()
    }

    const triggerBlur = (shouldBlur) => {
      const target = document.getElementById(targetElementId)
      if (target) {
        if (shouldBlur) {
          target.style.filter = 'blur(40px) grayscale(100%)'
          target.style.transition = 'filter 0.01s linear'
          target.style.pointerEvents = 'none'
        } else {
          target.style.filter = 'none'
          target.style.pointerEvents = 'auto'
        }
      }
    }

    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

      if (e.key === 'Meta' || e.keyCode === 91 || e.keyCode === 92) {
        triggerBlur(true)
      }

      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        return false
      }

      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73))
      ) {
        e.preventDefault()
        return false
      }

      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74))
      ) {
        e.preventDefault()
        return false
      }

      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67))
      ) {
        e.preventDefault()
        return false
      }

      if (
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85))
      ) {
        e.preventDefault()
        return false
      }

      if ((e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) || (isMac && e.metaKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80))) {
        e.preventDefault()
        return false
      }

      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        triggerBlur(true)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        return false
      }

      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) ||
        (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83))
      ) {
        e.preventDefault()
        return false
      }

      if (
        isMac && e.metaKey && e.shiftKey &&
        (e.key === '3' || e.key === '4' || e.key === '5' || e.keyCode === 51 || e.keyCode === 52 || e.keyCode === 53)
      ) {
        e.preventDefault()
        return false
      }
    }

    const handleKeyUp = (e) => {
      if (e.key === 'Meta' || e.key === 'Shift' || e.key === 'Control' || e.key === 'PrintScreen' || e.keyCode === 44) {
        setTimeout(() => triggerBlur(false), 150)

        if (e.key === 'PrintScreen' || e.keyCode === 44) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {})
          }
        }
      }
    }

    const handleDragStart = (e) => {
      e.preventDefault()
    }

    const handleWindowBlur = () => {
      triggerBlur(true)
    }

    const handleWindowFocus = () => {
      triggerBlur(false)
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    document.addEventListener('dragstart', handleDragStart)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      document.removeEventListener('dragstart', handleDragStart)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
    }
  }, [targetElementId])

  useEffect(() => {
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (disableDetector || (isDev && !window.__FORCE_WORKSPACE_SECURITY_DETECTOR__)) {
      return
    }

    const threshold = 160
    let wasOpen = false

    const detect = () => {
      const widthDiff = window.outerWidth - window.innerWidth
      const heightDiff = window.outerHeight - window.innerHeight
      const isOpen = widthDiff > threshold || heightDiff > threshold

      if (isOpen && !wasOpen) {
        wasOpen = true
        if (onDevToolsOpen) {
          onDevToolsOpen()
        }
      } else if (!isOpen && wasOpen) {
        
        wasOpen = false
      }
    }

    const intervalId = setInterval(detect, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [onDevToolsOpen, disableDetector])
}

export default useWorkspaceSecurity