import { Link } from 'react-router'

/**
 * A list of links, each with an icon, a label and an optional hint under the label.
 * items: [{ icon, label, hint?, to }]. Each `to` must be different (it's also the React key).
 * emptyMessage: shown when there are no items
 */
function LinkList({ items, emptyMessage }) {
  if (items.length === 0) {
    return <p className="muted">{emptyMessage}</p>
  }

  return (
    <div>
      {items.map((item) => (
        <LinkListItem key={item.to} item={item} />
      ))}
    </div>
  )
}

/** One link: its icon, its label, and its hint (if it has one) under the label. */
function LinkListItem({ item }) {
  // A component name in JSX must start with a capital letter, so copy the icon into one
  const Icon = item.icon

  return (
    <Link to={item.to} className="link-item">
      <Icon size={16} />
      <span>
        {item.label}
        {item.hint && <span className="link-hint">{item.hint}</span>}
      </span>
    </Link>
  )
}

export default LinkList
