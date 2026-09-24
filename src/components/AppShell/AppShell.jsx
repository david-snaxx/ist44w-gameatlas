import Wordmark from '../Wordmark/Wordmark.jsx'

/**
 * The layout every page uses: a frame (top bar, sidebar and bottom status bar) around a
 * rounded glass content zone that scrolls on its own.
 *
 * actions: global buttons at the end of the top bar
 * sidebar: navigation (e.g. <SidebarNav />)
 * breadcrumbs: shown at the start of the status bar
 * status: optional short text at the end of the status bar
 */
function AppShell({ actions, sidebar, breadcrumbs, status, children }) {
  return (
    <div className="shell">
      <div className="shell-brand">
        <Wordmark />
      </div>
      <header className="shell-bar">{actions}</header>
      <aside className="shell-side">{sidebar}</aside>
      <main className="shell-content">{children}</main>
      <footer className="shell-status">
        {breadcrumbs}
        {status && <div className="shell-status-text">{status}</div>}
      </footer>
    </div>
  )
}

export default AppShell
