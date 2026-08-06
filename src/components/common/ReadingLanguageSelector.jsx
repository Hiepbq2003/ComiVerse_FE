import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import '../../assets/style/common/reading-language-selector.css'

export const getLanguageInfo = (langCode) => {
  if (!langCode || langCode === '' || String(langCode).toLowerCase() === 'original') {
    return { code: '', name: 'Original', flag: '🌐', short: 'ORIG' }
  }
  const raw = String(langCode).trim()
  const code = raw.toLowerCase()
  switch (code) {
    case 'en':
    case 'eng':
    case 'english':
      return { code: raw, name: 'English', flag: '🇬🇧', short: 'EN' }
    case 'vi':
    case 'vie':
    case 'vietnamese':
    case 'tiếng việt':
      return { code: raw, name: 'Tiếng Việt', flag: '🇻🇳', short: 'VI' }
    case 'ja':
    case 'jpn':
    case 'japanese':
    case '日本語':
      return { code: raw, name: '日本語', flag: '🇯🇵', short: 'JA' }
    case 'ko':
    case 'kor':
    case 'korean':
    case '한국어':
      return { code: raw, name: '한국어', flag: '🇰🇷', short: 'KO' }
    case 'zh':
    case 'chi':
    case 'zho':
    case 'chinese':
    case '中文':
      return { code: raw, name: '中文', flag: '🇨🇳', short: 'ZH' }
    case 'fr':
    case 'french':
      return { code: raw, name: 'Français', flag: '🇫🇷', short: 'FR' }
    case 'es':
    case 'spanish':
      return { code: raw, name: 'Español', flag: '🇪🇸', short: 'ES' }
    default:
      return {
        code: raw,
        name: raw.length <= 4 ? raw.toUpperCase() : raw,
        flag: '🔤',
        short: raw.toUpperCase().slice(0, 3)
      }
  }
}

export default function ReadingLanguageSelector({
  languages = [],
  selectedLanguage = '',
  onChange,
  showLabel = true,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Standardize language options
  const options = [
    getLanguageInfo(''),
    ...languages.map((lang) => getLanguageInfo(lang))
  ]

  // Filter out any potential duplicates based on code
  const uniqueOptions = options.filter(
    (opt, idx, self) => idx === self.findIndex((o) => o.code.toLowerCase() === opt.code.toLowerCase())
  )

  const activeOption = uniqueOptions.find(
    (opt) => opt.code.toLowerCase() === String(selectedLanguage || '').toLowerCase()
  ) || uniqueOptions[0]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (uniqueOptions.length <= 1) return null

  return (
    <div
      className={`reading-lang-container ${compact ? 'compact' : ''}`}
      ref={dropdownRef}
    >
      {showLabel && (
        <span className="reading-lang-label">
          <Globe size={14} color="#c084fc" />
          READING LANGUAGE
        </span>
      )}

      <div className="reading-lang-dropdown-wrapper">
        <button
          type="button"
          className={`reading-lang-trigger-btn ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Select Reading Language"
        >
          <span className="reading-lang-flag">{activeOption.flag}</span>
          <span>{activeOption.name}</span>
          <ChevronDown size={15} className={`reading-lang-chevron ${isOpen ? 'open' : ''}`} />
        </button>

        {isOpen && (
          <div className="reading-lang-menu">
            {uniqueOptions.map((opt) => {
              const isSelected = opt.code.toLowerCase() === String(selectedLanguage || '').toLowerCase()
              return (
                <button
                  key={opt.code || 'original'}
                  type="button"
                  className={`reading-lang-menu-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(opt.code)
                    setIsOpen(false)
                  }}
                >
                  <div className="reading-lang-menu-item-left">
                    <span className="reading-lang-flag">{opt.flag}</span>
                    <span>{opt.name}</span>
                  </div>
                  {isSelected && <Check size={14} color="#c084fc" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
