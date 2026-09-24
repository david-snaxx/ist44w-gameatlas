import { Link } from 'react-router'

/**
 * A list of links, each with an icon, a label and an optional hint under the label.
 * items: [{ icon, label, hint?, to }]. Each `to` must be different (it's also the React key).
 * emptyMessage: shown when there are no items
 */
function LinkList({ items, emptyMessage }) {
  if (items.length === 0) return <p className="muted">{emptyMessage}</p>

  return (
    <div>
      {items.map((item) => (
        <Link key={item.to} to={item.to} className="link-item">
          <item.icon size={16} />
          <span>
            {item.label}
            {item.hint && <span className="link-hint">{item.hint}</span>}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default LinkList
