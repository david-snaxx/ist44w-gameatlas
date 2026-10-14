import { Link } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import Section from '../../components/Section/Section.jsx'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'

/**
 * The logged-in account (/account). A proof of concept: it shows everything the API says about the
 * user and nothing else, which is enough to see that the session cookie is reaching the backend.
 */
function AccountPage() {
  const currentUser = useCurrentUser()

  let content = <AccountDetails user={currentUser.user} />
  if (!currentUser.checked) {
    content = <p className="muted">Checking who is logged in…</p>
  } else if (!currentUser.user) {
    content = <SignedOut />
  }

  return (
    <AppShell crumbs={[{ label: 'Account' }]} status={statusText(currentUser)}>
      <div className="page">
        <header className="page-head">
          <div>
            <h1>Account</h1>
            <p className="page-intro">
              Everything the server knows about the account this browser is logged in as.
            </p>
          </div>
        </header>

        <Section title="Your account">{content}</Section>
      </div>
    </AppShell>
  )
}

/**
 * Every field of the User type (backend/src/types/users.ts). `passwordHash` is the one field that
 * isn't here: the API never sends it, which is the point.
 */
function AccountDetails({ user }) {
  return (
    <div>
      <DetailRow label="Display name" value={user.displayName} />
      <DetailRow label="Email" value={user.email} />
      <DetailRow label="User ID" value={user.id} />
      <DetailRow label="Created" value={formatDateTime(user.createdAt)} />
      <DetailRow label="Projects" value={<ProjectIds ids={user.projectIds} />} />
    </div>
  )
}

/** One label and value, laid out like the asset view's rows. */
function DetailRow({ label, value }) {
  return (
    <div className="value-row">
      <span className="muted">{label}</span>
      <div className="value">{value}</div>
    </div>
  )
}

/** The projects this account can open. There are none until the project routes have a UI. */
function ProjectIds({ ids }) {
  if (ids.length === 0) {
    return <span className="muted">None yet</span>
  }

  const lines = []
  for (const id of ids) {
    lines.push(<p key={id}>{id}</p>)
  }
  return (
    <div>
      <p>{plural(ids.length, 'project')}</p>
      {lines}
    </div>
  )
}

/** What the page shows when this browser has no session. */
function SignedOut() {
  return (
    <EmptyState message="Nobody is logged in on this browser.">
      <Link to="/login" className="btn btn-secondary">
        Go to log in
      </Link>
    </EmptyState>
  )
}

// The status bar text
function statusText(currentUser) {
  if (!currentUser.checked) {
    return 'Checking…'
  }
  if (!currentUser.user) {
    return 'Not logged in'
  }
  return `Logged in as ${currentUser.user.email}`
}

export default AccountPage
