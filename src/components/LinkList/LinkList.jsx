import { Link } from 'react-router'
import { cx } from '../../utils/cx.js'

/**
 * A list of links, each with an icon, a label and an optional hint and meta text.
 * items: [{ id, icon, label, hint?, tone?, meta?, to }]
 *   tone: 'error' | 'warning' colors the hint (e.g. "3 problems")
 *   meta: short text on the right (e.g. a date)
 * emptyMessage: shown when there are no items
 */
function LinkList({ items, emptyMessage }) {
  if (items.length === 0) return emptyMessage ? <p className="links-empty">{emptyMessage}</p> : null

  return (
    <ul className="links">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={item.to} className="link-item">
            <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="link-text">
              <span className="truncate">{item.label}</span>
              {item.hint && <span className={cx('link-hint', item.tone && `tone-${item.tone}`)}>{item.hint}</span>}
            </span>
            {item.meta && <span className="link-meta">{item.meta}</span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default LinkList
