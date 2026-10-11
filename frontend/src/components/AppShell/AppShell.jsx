import { Link } from 'react-router'
import AppSidebar from '../AppSidebar/AppSidebar.jsx'

/**
 * The layout every page uses: a frame (top bar, sidebar and bottom status bar) around a
 * rounded glass content zone that scrolls on its own.
 *
 * actions: buttons at the end of the top bar
 * crumbs: the breadcrumb trail at the start of the status bar, [{ label, to? }].
 *   `to` is an app route; the last crumb is the current page.
 * status: optional short text at the end of the status bar
 */
function AppShell({ actions, crumbs, status, children }) {
  return (
    <div className="shell">
      <div className="shell-brand">GameAtlas</div>
      <header className="shell-bar">{actions}</header>
      <aside className="shell-side">
        <AppSidebar />
      </aside>
      <main className="shell-content">{children}</main>
      <footer className="shell-status">
        <span>
          {crumbs.map((crumb, index) => (
            <Crumb key={index} crumb={crumb} isFirst={index === 0} />
          ))}
        </span>
        {status && <span className="push-right">{status}</span>}
      </footer>
    </div>
  )
}

/** One step of the breadcrumb trail: a link, or plain text for the current page. */
function Crumb({ crumb, isFirst }) {
  let separator = ' › '
  if (isFirst) {
    separator = ''
  }

  if (crumb.to) {
    return (
      <span>
        {separator}
        <Link to={crumb.to}>{crumb.label}</Link>
      </span>
    )
  }
  return (
    <span>
      {separator}
      {crumb.label}
    </span>
  )
}

export default AppShell
