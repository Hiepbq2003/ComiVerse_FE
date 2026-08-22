import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, LoaderCircle, Search, X } from 'lucide-react'

const MAX_VISIBLE_RESULTS = 8

const initialsFor = (value) => {
  const text = String(value || '').trim()
  if (!text) return '?'
  return text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function AudienceAvatar({ imageUrl, label }) {
  return (
    <span className="broadcast-audience-avatar" aria-hidden="true">
      <span>{initialsFor(label)}</span>
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          onError={(event) => {
            event.currentTarget.style.display = 'none'
          }}
        />
      )}
    </span>
  )
}

function BroadcastAudienceSearch({
  inputId,
  placeholder,
  selectedItems,
  onChange,
  loadOptions,
  getId,
  getTitle,
  getSubtitle,
  getMeta,
  getImageUrl = () => '',
  emptyMessage,
  maxSelected,
  disabled = false,
}) {
  const rootRef = useRef(null)
  const requestSequence = useRef(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loadError, setLoadError] = useState('')

  const selectedIds = useMemo(
    () => new Set(selectedItems.map((item) => String(getId(item)))),
    [getId, selectedItems],
  )

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!isOpen || disabled) return undefined
    const sequence = ++requestSequence.current
    const timer = window.setTimeout(async () => {
      setIsLoading(true)
      setLoadError('')
      try {
        const options = await loadOptions(query.trim())
        if (requestSequence.current !== sequence) return
        setResults((Array.isArray(options) ? options : []).slice(0, MAX_VISIBLE_RESULTS))
        setActiveIndex(-1)
      } catch {
        if (requestSequence.current !== sequence) return
        setResults([])
        setLoadError('Could not load results. Try again.')
      } finally {
        if (requestSequence.current === sequence) setIsLoading(false)
      }
    }, query.trim() ? 250 : 0)

    return () => window.clearTimeout(timer)
  }, [disabled, isOpen, loadOptions, query])

  const toggleItem = (item) => {
    const itemId = String(getId(item))
    if (selectedIds.has(itemId)) {
      onChange(selectedItems.filter((selected) => String(getId(selected)) !== itemId))
      return
    }
    if (selectedItems.length >= maxSelected) return
    onChange([...selectedItems, item])
    setQuery('')
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, results.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && isOpen && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault()
      toggleItem(results[activeIndex])
    }
  }

  return (
    <div className="broadcast-audience-search" ref={rootRef}>
      {selectedItems.length > 0 && (
        <div className="broadcast-selected-list" aria-label="Selected recipients">
          {selectedItems.map((item) => {
            const itemId = String(getId(item))
            const itemTitle = getTitle(item)
            return (
              <span className="broadcast-selected-chip" key={itemId}>
                <AudienceAvatar imageUrl={getImageUrl(item)} label={itemTitle} />
                <span className="broadcast-selected-chip-label">{itemTitle}</span>
                <button
                  type="button"
                  onClick={() => toggleItem(item)}
                  aria-label={`Remove ${itemTitle}`}
                  title={`Remove ${itemTitle}`}
                  disabled={disabled}
                >
                  <X size={14} />
                </button>
              </span>
            )
          })}
          {selectedItems.length > 1 && (
            <button
              type="button"
              className="broadcast-clear-selection"
              onClick={() => {
                onChange([])
                setQuery('')
              }}
              disabled={disabled}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      <div className={`broadcast-search-box ${isOpen ? 'is-open' : ''}`}>
        <Search size={17} aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${inputId}-results`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled || selectedItems.length >= maxSelected}
        />
        {isLoading && <LoaderCircle className="broadcast-search-spinner" size={17} aria-label="Loading" />}
        <span className="broadcast-selection-count">
          {selectedItems.length}/{maxSelected}
        </span>
      </div>

      {isOpen && !disabled && (
        <div className="broadcast-search-results" id={`${inputId}-results`} role="listbox">
          {isLoading && results.length === 0 ? (
            <div className="broadcast-search-status">Searching...</div>
          ) : loadError ? (
            <div className="broadcast-search-status is-error">{loadError}</div>
          ) : results.length === 0 ? (
            <div className="broadcast-search-status">{emptyMessage}</div>
          ) : (
            results.map((item, index) => {
              const itemId = String(getId(item))
              const itemTitle = getTitle(item)
              const isSelected = selectedIds.has(itemId)
              return (
                <button
                  type="button"
                  className={`broadcast-search-result ${activeIndex === index ? 'is-active' : ''}`}
                  key={itemId}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleItem(item)}
                >
                  <AudienceAvatar imageUrl={getImageUrl(item)} label={itemTitle} />
                  <span className="broadcast-search-result-copy">
                    <strong>{itemTitle}</strong>
                    <span>{getSubtitle(item)}</span>
                  </span>
                  <span className="broadcast-search-result-meta">{getMeta(item)}</span>
                  <span className={`broadcast-result-check ${isSelected ? 'is-selected' : ''}`}>
                    {isSelected && <Check size={14} />}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default BroadcastAudienceSearch
