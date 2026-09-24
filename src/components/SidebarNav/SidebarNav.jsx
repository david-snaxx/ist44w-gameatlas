import { Link } from 'react-router'
import { cx } from '../../utils/cx.js'

/**
 * A titled list of links for the AppShell sidebar.
 * items: [{ id, label, icon?, to?, href? }]
 *   to: an app route (navigates without reloading the page)
 *   href: a plain link, e.g. "#colors" to jump within the page (defaults to "#id")
 */
function SidebarNav({ title, label, items, activeId, onSelect }) {
  return (
    // label names the navigation for screen readers when there's no visible title
    <nav aria-label={label ?? title}>
      {title && <h2 className="nav-title">{title}</h2>}
      <ul className="nav-list">
        {items.map((item) => {
          const isActive = item.id === activeId
          const linkProps = {
            className: cx('nav-item', isActive && 'is-active'),
            'aria-current': isActive ? 'page' : undefined,
            onClick: () => onSelect?.(item.id),
          }
          const content = (
            <>
              {item.icon && <item.icon size={16} strokeWidth={1.75} aria-hidden="true" />}
              <span className="truncate">{item.label}</span>
            </>
          )
          return (
            <li key={item.id}>
              {item.to ? (
                <Link to={item.to} {...linkProps}>
                  {content}
                </Link>
              ) : (
                <a href={item.href ?? `#${item.id}`} {...linkProps}>
                  {content}
                </a>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default SidebarNav
