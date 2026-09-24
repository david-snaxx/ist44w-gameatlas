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
            <span key={index}>
              {index > 0 && ' › '}
              {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : crumb.label}
            </span>
          ))}
        </span>
        {status && <span className="push-right">{status}</span>}
      </footer>
    </div>
  )
}

export default AppShell
