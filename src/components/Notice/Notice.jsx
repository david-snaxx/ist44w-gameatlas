import { Info, TriangleAlert } from 'lucide-react'
import { cx } from '../../utils/cx.js'

/**
 * A short explanation above a form: why this editor is pre-filled, or what's out of date.
 * tone: 'info' (default) or 'warning'. Anything richer than a sentence (a list, a link)
 * can be passed as children.
 */
function Notice({ tone = 'info', children, ...props }) {
  const Icon = tone === 'warning' ? TriangleAlert : Info
  return (
    <div className={cx('notice', tone === 'warning' && 'notice-warning')} {...props}>
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}

/**
 * Why an editor opened already filled in (STYLE-GUIDELINES §7.15). `extra` adds a
 * sentence that only applies to one kind of thing, e.g. that a blueprint's assets
 * aren't copied.
 */
export function ImportNotice({ isDuplicate, originName, extra = '' }) {
  return (
    <Notice>
      {isDuplicate ? `Copy of “${originName}”. Change what you need, then save.${extra}` : 'Imported from a file. Review it, then save.'}
    </Notice>
  )
}

export default Notice
