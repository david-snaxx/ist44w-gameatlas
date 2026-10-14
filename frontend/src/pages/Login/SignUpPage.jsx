import { useState } from 'react'
import { useNavigate } from 'react-router'
import Button from '../../components/Button/Button.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { signUp } from '../../api/users.js'
import SignedOutLayout from './SignedOutLayout.jsx'
import styles from './Login.module.css'

// The same rules the backend keeps (validatePassword and validateDisplayName in routes/users.ts)
const MIN_PASSWORD_LENGTH = 8
const MAX_DISPLAY_NAME_LENGTH = 64

/** Making an account (/signup): email, password and a display name. */
function SignUpPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  // What's wrong with the boxes right now, by field name. Empty until the person tries to sign up.
  const [problems, setProblems] = useState({})
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()

    const found = findProblems(email, password, displayName)
    setProblems(found)
    if (Object.keys(found).length > 0) {
      return
    }

    setSending(true)
    const result = await signUp(email.trim(), password, displayName.trim())
    setSending(false)

    if (result.error) {
      // The server says things like "That email is already registered"
      toast.show({ status: 'error', message: result.error })
      return
    }

    // Signing up doesn't log anyone in, so this goes to the login page with the email filled in
    toast.show({ status: 'success', message: 'Account created. Log in to continue.' })
    navigate('/login', { state: { email: result.user.email } })
  }

  return (
    <SignedOutLayout title="Create an account">
      <form className={styles.fields} onSubmit={handleSubmit}>
        <PropertyRow label="Display name" error={problems.displayName} help="The name other people see.">
          <TextInput value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        </PropertyRow>

        <PropertyRow label="Email" error={problems.email}>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </PropertyRow>

        <PropertyRow
          label="Password"
          error={problems.password}
          help={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        >
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </PropertyRow>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={sending}>
            Sign up
          </Button>
          <Button disabled={sending} onClick={() => navigate('/login')}>
            Back to log in
          </Button>
        </div>
      </form>
    </SignedOutLayout>
  )
}

/**
 * What's wrong with the form before it's worth sending, by field name. An empty object means
 * there's nothing wrong.
 *
 * These are the same rules the backend keeps, checked here as well so the answer is instant and
 * lands under the right box. The backend is still the one that decides (CLAUDE.md), and it's the
 * only one that can tell whether the email is already registered.
 */
function findProblems(email, password, displayName) {
  const problems = {}

  const trimmedName = displayName.trim()
  if (trimmedName === '') {
    problems.displayName = 'Enter a display name'
  } else if (trimmedName.length > MAX_DISPLAY_NAME_LENGTH) {
    problems.displayName = `Use ${MAX_DISPLAY_NAME_LENGTH} characters or fewer`
  }

  if (email.trim() === '') {
    problems.email = 'Enter your email'
  }

  if (password === '') {
    problems.password = 'Enter a password'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    problems.password = `Use at least ${MIN_PASSWORD_LENGTH} characters`
  }

  return problems
}

export default SignUpPage
