import { useState, useRef, useEffect } from 'react'
import { Globe, Check, ChevronDown } from 'lucide-react'
import '../../assets/style/common/reading-language-selector.css'

export const getLanguageInfo = (langCode) => {
  if (!langCode || langCode === '' || String(langCode).toLowerCase() === 'original') {
    return { code: '', name: 'Original', flag: '🌐', short: 'ORIG' }
  }
  const raw = String(langCode).trim()
  const code = normalizeLanguageCode(raw)
  switch (code) {
    case 'en':
      return { code: raw, name: 'English', flag: '🇬🇧', short: 'EN' }
    case 'vi':
      return { code: raw, name: 'Tiếng Việt', flag: '🇻🇳', short: 'VI' }
    case 'ja':
      return { code: raw, name: '日本語', flag: '🇯🇵', short: 'JA' }
    case 'ko':
      return { code: raw, name: '한국어', flag: '🇰🇷', short: 'KO' }
    case 'zh':
      return { code: raw, name: '中文', flag: '🇨🇳', short: 'ZH' }
    case 'fr':
      return { code: raw, name: 'Français', flag: '🇫🇷', short: 'FR' }
    case 'es':
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

function mapKnownLanguage(s) {
  if (['vi', 'vie', 'vn', 'vietnamese', 'tieng viet'].includes(s)) return 'vi'
  if (['en', 'eng', 'english'].includes(s)) return 'en'
  if (['ja', 'jpn', 'jp', 'japanese'].includes(s)) return 'ja'
  if (['ko', 'kor', 'kr', 'korean'].includes(s)) return 'ko'
  if (['zh', 'chi', 'zho', 'cn', 'chinese'].includes(s)) return 'zh'
  if (['fr', 'fra', 'french'].includes(s)) return 'fr'
  if (['es', 'spa', 'spanish'].includes(s)) return 'es'
  return null
}

export function normalizeLanguageCode(langCode) {
  if (!langCode || String(langCode).toLowerCase() === 'original') return ''
  const s = String(langCode)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const mapped = mapKnownLanguage(s)
  if (mapped) return mapped
  const first = s.split(' ')[0]
  return mapKnownLanguage(first) || first
}

export function chapterHasLanguage(chapter, selectedLanguage) {
  if (!selectedLanguage) return true
  const langs = chapter?.translatedLanguages
  if (!Array.isArray(langs) || langs.length === 0) return false
  const wanted = normalizeLanguageCode(selectedLanguage)
  return langs.some((lang) => normalizeLanguageCode(lang) === wanted)
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

  // Filter out any potential duplicates based on normalized language
  const uniqueOptions = options.filter(
    (opt, idx, self) => idx === self.findIndex((o) => normalizeLanguageCode(o.code) === normalizeLanguageCode(opt.code))
  )

  const activeOption = uniqueOptions.find(
    (opt) => normalizeLanguageCode(opt.code) === normalizeLanguageCode(selectedLanguage)
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
              const isSelected = normalizeLanguageCode(opt.code) === normalizeLanguageCode(selectedLanguage)
              return (
                <button
                  key={opt.code || 'original'}
                  type="button"
                  className={`reading-lang-menu-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(normalizeLanguageCode(opt.code))
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
