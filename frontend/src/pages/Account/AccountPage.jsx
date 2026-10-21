import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import AppShell from '../../components/AppShell/AppShell.jsx'
import Button from '../../components/Button/Button.jsx'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog.jsx'
import EmptyState from '../../components/EmptyState/EmptyState.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import Section from '../../components/Section/Section.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { clearCurrentUser } from '../../api/currentUserStore.js'
import { useCurrentUser } from '../../api/useCurrentUser.js'
import { deleteMe } from '../../api/users.js'
import { formatDateTime } from '../../utils/formatDate.js'
import { plural } from '../../utils/plural.js'

/** The logged-in account (/account): everything the API says about the user. */
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
        {currentUser.user && <DeleteAccount email={currentUser.user.email} />}
      </div>
    </AppShell>
  )
}

/** Every field of the User type except `passwordHash`, which the API never sends. */
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

/** The danger section: the password again, then a confirmation, then the account is deleted on the server. */
function DeleteAccount({ email }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  // Shown under the password box when it's left empty
  const [problem, setProblem] = useState(null)
  const [confirming, setConfirming] = useState(false)
  // True while the server is deleting, so the button can't send it twice
  const [sending, setSending] = useState(false)

  function handleSubmit(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()

    if (password === '') {
      setProblem('Enter your password')
      return
    }
    setProblem(null)
    setConfirming(true)
  }

  async function handleConfirm() {
    setConfirming(false)
    setSending(true)
    const result = await deleteMe(password)
    setSending(false)

    if (result.error) {
      // The server says things like "Wrong password"; an error toast stays until dismissed
      toast.show({ status: 'error', message: result.error })
      return
    }

    // The server already ended every session; this tells every open page that nobody is logged in
    clearCurrentUser()
    toast.show({ status: 'success', message: 'Account deleted' })
    navigate('/login')
  }

  return (
    <>
      <Section title="Delete account">
        <form className="stack" onSubmit={handleSubmit}>
          <p className="small muted">
            Deletes your account and logs you out in every browser. Projects only you are in are deleted with all
            their blueprints, assets and dialogues; projects you share stay with the other members. This can't be
            undone.
          </p>
          <PropertyRow label="Password" error={problem} help="Your password, to confirm it's you.">
            <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </PropertyRow>
          <div className="row">
            <Button type="submit" variant="danger" icon={Trash2} disabled={sending}>
              Delete account
            </Button>
          </div>
        </form>
      </Section>

      {confirming && (
        <ConfirmDialog
          title="Delete your account?"
          message={`The account ${email} will be deleted, with every project only you are in. You'll be logged out in every browser. This can't be undone.`}
          confirmLabel="Delete account"
          onCancel={() => setConfirming(false)}
          onConfirm={handleConfirm}
        />
      )}
    </>
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
