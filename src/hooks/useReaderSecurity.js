import { useEffect } from 'react'

/**
 * Custom hook to enforce copy-protection, blocking shortcuts, context menus,
 * and performing debugger-based detection of open DevTools.
 *
 * @param {Object} options
 * @param {Function} options.onDevToolsOpen Callback when DevTools detection triggers
 * @param {boolean} [options.disableDetector=false] Option to disable the debugger detector (e.g., for local development)
 */
function useReaderSecurity({ onDevToolsOpen, disableDetector = false }) {
  useEffect(() => {
    let activeKeys = new Set()
    let pollingInterval = null

    // 1. Context Menu Blocker
    const handleContextMenu = (e) => {
      e.preventDefault()
    }

    const triggerBlur = (shouldBlur) => {
      const readerDom = document.getElementById('secure-comic-reader')
      if (readerDom) {
        if (shouldBlur) {
          readerDom.style.filter = 'blur(40px) grayscale(100%)'
          readerDom.style.transition = 'filter 0.01s linear'
          readerDom.style.pointerEvents = 'none'
        } else {
          readerDom.style.filter = 'none'
          readerDom.style.pointerEvents = 'auto'
        }
      }
    }

    // 2. Keyboard Shortcuts Blocker
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0

      if (e.key === 'Meta' || e.key === 'Shift' || e.key === 'Control' || e.keyCode === 91 || e.keyCode === 92) {
        triggerBlur(true)
      }

      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault()
        return false
      }

      // Ctrl+Shift+I or Cmd+Alt+I (DevTools)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73))
      ) {
        e.preventDefault()
        return false
      }

      // Ctrl+Shift+J or Cmd+Alt+J (DevTools Console)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74))
      ) {
        e.preventDefault()
        return false
      }

      // Ctrl+Shift+C or Cmd+Alt+C (DevTools Inspect)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67))
      ) {
        e.preventDefault()
        return false
      }

      // Ctrl+U or Cmd+Alt+U (View Source)
      if (
        (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) ||
        (isMac && e.metaKey && e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85))
      ) {
        e.preventDefault()
        return false
      }

      // Ctrl+S or Cmd+S (Save Page)
      if ((e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) || (isMac && e.metaKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83))) {
        e.preventDefault()
        return false
      }

      // Ctrl+P or Cmd+P (Print Page)
      if ((e.ctrlKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80)) || (isMac && e.metaKey && (e.key === 'P' || e.key === 'p' || e.keyCode === 80))) {
        e.preventDefault()
        return false
      }

      // PrintScreen Key (PrtScn)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault()
        triggerBlur(true)
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {})
        }
        return false
      }

      // Ctrl+Shift+S / Cmd+Shift+S / Meta+Shift+S (Snipping Tool & screenshot combinations)
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) ||
        (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83))
      ) {
        e.preventDefault()
        return false
      }

      // Cmd+Shift+3 / Cmd+Shift+4 / Cmd+Shift+5 (macOS Screenshots)
      if (
        isMac && e.metaKey && e.shiftKey &&
        (e.key === '3' || e.key === '4' || e.key === '5' || e.keyCode === 51 || e.keyCode === 52 || e.keyCode === 53)
      ) {
        e.preventDefault()
        return false
      }
    }

    // 3. Print Screen KeyUp Clipboard Clearer
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

    // 4. Selection and Drag Blockers (Global fallback)
    const handleDragStart = (e) => {
      e.preventDefault()
    }

    const handleWindowBlur = () => {
      triggerBlur(true)
    }

    const handleWindowFocus = () => {
      triggerBlur(false)
    }

    // Bind listeners
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
  }, [])

  // 4. Layer 3: DevTools Debugger Hook Detector
  useEffect(() => {
    // Avoid running debugger statements in development environments to not block developers
    const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    if (disableDetector || (isDev && !window.__FORCE_READER_SECURITY_DETECTOR__)) {
      return
    }

    let isDevToolsTriggered = false
    let intervalId

    const detect = () => {
      if (isDevToolsTriggered) return

      const start = performance.now()

      // The debugger statement forces code execution to pause if DevTools is open.
      // If DevTools is closed, the pause doesn't trigger and delta remains extremely low.
      debugger

      const end = performance.now()

      // If it takes more than 100ms, it's highly likely that the debugger paused execution
      if (end - start > 100) {
        isDevToolsTriggered = true
        if (onDevToolsOpen) {
          onDevToolsOpen()
        }
        // Continuous reload defense action
        window.location.reload()
      }
    }

    // Run interval
    intervalId = setInterval(detect, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [onDevToolsOpen, disableDetector])
}

export default useReaderSecurity
