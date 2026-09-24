import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../utils/cx.js'

const POPOVER_MAX_HEIGHT = 280

/**
 * Dropdown used for enum and reference properties.
 * options: [{ value, label, hint? }]. hint is shown in mono (e.g. an asset ID).
 * searchable: adds a filter box (use for references).
 *
 * The option list is rendered into document.body (a "portal") so scrolling panels,
 * side panels and graph canvases can't clip it.
 */
function Select({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchable = false,
  invalid,
  disabled,
  className,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const listId = useId()

  const selected = options.find((option) => option.value === value)
  const filtered = query
    ? options.filter((option) =>
        `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      )
    : options

  // While open: close on outside clicks, page scrolls, wheel zooms (e.g. the graph canvas) and window resizes
  useEffect(() => {
    if (!open) return
    const isInside = (target) =>
      rootRef.current?.contains(target) || popoverRef.current?.contains(target)
    function handlePointerDown(event) {
      if (!isInside(event.target)) setOpen(false)
    }
    function handleScroll(event) {
      if (!popoverRef.current?.contains(event.target)) setOpen(false)
    }
    function handleResize() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('wheel', handleScroll, { capture: true, passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('wheel', handleScroll, { capture: true })
      window.removeEventListener('resize', handleResize)
    }
  }, [open])

  function openList() {
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < POPOVER_MAX_HEIGHT && rect.top > spaceBelow
    setPosition(
      placeAbove
        ? { left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4 }
        : { left: rect.left, width: rect.width, top: rect.bottom + 4 },
    )
    setQuery('')
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)))
    setOpen(true)
  }

  function choose(option) {
    onChange(option.value)
    setOpen(false)
    triggerRef.current.focus()
  }

  function handleKeyDown(event) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault()
        openList()
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation() // don't also close a surrounding side panel
      setOpen(false)
      triggerRef.current.focus()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex])
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  const activeOptionId = open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined

  return (
    // className sizes the whole control, so it belongs on the root, not on the trigger button
    <div ref={rootRef} className={cx('select', className)} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={cx('input', 'select-trigger', invalid && 'is-invalid')}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={searchable ? undefined : activeOptionId}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        {...props}
      >
        <span className={cx('select-value', !selected && 'is-placeholder')}>
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && <span className="mono-xs">{selected.hint}</span>}
        <ChevronDown size={16} strokeWidth={1.75} className="select-chevron" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div ref={popoverRef} className={cx('glass', 'select-popover')} style={position}>
            {searchable && (
              <div className="select-search">
                <Search size={14} strokeWidth={1.75} aria-hidden="true" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search…"
                  aria-label="Search options"
                  aria-controls={listId}
                  aria-activedescendant={activeOptionId}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActiveIndex(0)
                  }}
                />
              </div>
            )}
            <ul id={listId} role="listbox" className="select-list">
              {filtered.length === 0 && <li className="select-empty">No matches</li>}
              {filtered.map((option, index) => (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  className={cx('select-option', index === activeIndex && 'is-active')}
                  onPointerEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    className={cx('select-check', option.value !== value && 'is-hidden')}
                    aria-hidden="true"
                  />
                  <span className="select-option-label">{option.label}</span>
                  {option.hint && <span className="mono-xs">{option.hint}</span>}
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  )
}

export default Select
