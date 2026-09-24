import { Braces, Check, ChevronRight, Copy, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../../utils/cx.js'
import Button from '../Button/Button.jsx'
import SegmentedControl from '../SegmentedControl/SegmentedControl.jsx'

const VIEWS = [
  { value: 'code', label: 'Code' },
  { value: 'tree', label: 'Tree' },
]

// Matches, in order: a string (and a following ":" if it's a key), true/false/null, or a number
const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

// Turns formatted JSON text into colored <span>s (no innerHTML needed)
function highlight(json) {
  const parts = []
  let last = 0
  for (const match of json.matchAll(TOKEN)) {
    if (match.index > last) {
      parts.push(<span key={`p${last}`} className={'json-punct'}>{json.slice(last, match.index)}</span>)
    }
    const [text, string, colon, literal] = match
    if (string) {
      parts.push(<span key={match.index} className={colon ? 'json-key' : 'json-string'}>{string}</span>)
      if (colon) parts.push(<span key={`c${match.index}`} className={'json-punct'}>{colon}</span>)
    } else if (literal) {
      parts.push(<span key={match.index} className={'json-literal'}>{literal}</span>)
    } else {
      parts.push(<span key={match.index} className={'json-number'}>{text}</span>)
    }
    last = match.index + text.length
  }
  if (last < json.length) {
    parts.push(<span key={`p${last}`} className={'json-punct'}>{json.slice(last)}</span>)
  }
  return parts
}

function valueClassName(value) {
  if (typeof value === 'string') return 'json-string'
  if (typeof value === 'number') return 'json-number'
  return 'json-literal'
}

function TreeNode({ name, value, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2)
  const isContainer = value !== null && typeof value === 'object'

  if (!isContainer) {
    return (
      <div className="json-leaf" style={{ '--depth': depth }}>
        {name !== undefined && (
          <>
            <span className="json-key">{name}</span>
            <span className={'json-punct'}>: </span>
          </>
        )}
        <span className={valueClassName(value)}>{JSON.stringify(value)}</span>
      </div>
    )
  }

  const entries = Array.isArray(value) ? value.map((item, index) => [index, item]) : Object.entries(value)
  const summary = Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`

  return (
    <>
      <button
        type="button"
        className="json-branch"
        style={{ '--depth': depth }}
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <ChevronRight
          size={14}
          strokeWidth={1.75}
          className={cx('json-chevron', open && 'is-open')}
          aria-hidden="true"
        />
        <span className={name !== undefined ? 'json-key' : 'json-punct'}>{name ?? 'root'}</span>
        <span className="json-summary">{summary}</span>
      </button>
      {open && entries.map(([key, item]) => <TreeNode key={key} name={key} value={item} depth={depth + 1} />)}
    </>
  )
}

/**
 * Read-only JSON view with Code and Tree views.
 * By default it's hidden until the user asks for it; alwaysVisible skips that (e.g. a dedicated JSON tab).
 */
function JsonPreview({ value, alwaysVisible = false }) {
  const [visible, setVisible] = useState(alwaysVisible)
  const [view, setView] = useState('code')
  const [copied, setCopied] = useState(false)
  const json = JSON.stringify(value, null, 2)

  async function handleCopy() {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (!visible) {
    return (
      <Button variant="ghost" icon={Braces} onClick={() => setVisible(true)}>
        Show JSON
      </Button>
    )
  }

  return (
    <div className="json">
      <div className="row between">
        <SegmentedControl label="JSON view" options={VIEWS} value={view} onChange={setView} />
        <div className="row">
          {view === 'code' && (
            <Button
              variant="ghost"
              icon={copied ? Check : Copy}
              aria-label="Copy JSON"
              title="Copy JSON"
              onClick={handleCopy}
            />
          )}
          {!alwaysVisible && (
            <Button
              variant="ghost"
              icon={EyeOff}
              aria-label="Hide JSON"
              title="Hide JSON"
              onClick={() => setVisible(false)}
            />
          )}
        </div>
      </div>
      {view === 'code' ? (
        <pre className="json-code">
          <code>{highlight(json)}</code>
        </pre>
      ) : (
        <div className="json-tree">
          <TreeNode value={value} />
        </div>
      )}
    </div>
  )
}

export default JsonPreview
