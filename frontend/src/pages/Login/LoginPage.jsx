import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Button from '../../components/Button/Button.jsx'
import PropertyRow from '../../components/form/PropertyRow.jsx'
import TextInput from '../../components/form/TextInput.jsx'
import { useToast } from '../../components/Toast/useToast.js'
import { setCurrentUser } from '../../api/currentUserStore.js'
import { logIn } from '../../api/users.js'
import SignedOutLayout from './SignedOutLayout.jsx'
import styles from './Login.module.css'

/** Logging in (/login): email, password, and a way over to signing up. */
function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  // Arriving from the sign-up page, the email is already known, so it starts filled in
  const startingEmail = location.state?.email ?? ''
  const [email, setEmail] = useState(startingEmail)
  const [password, setPassword] = useState('')
  // What's wrong with the boxes right now, by field name. Empty until the person tries to log in.
  const [problems, setProblems] = useState({})
  const [sending, setSending] = useState(false)

  async function handleSubmit(event) {
    // Without this the browser reloads the page when the form is submitted
    event.preventDefault()

    const found = findProblems(email, password)
    setProblems(found)
    if (Object.keys(found).length > 0) {
      return
    }

    setSending(true)
    const result = await logIn(email.trim(), password)
    setSending(false)

    if (result.error) {
      // The server says things like "Wrong email or password"; an error toast stays until dismissed
      toast.show({ status: 'error', message: result.error })
      return
    }

    // Tell the rest of the app straight away, so the sidebar shows the name without asking again
    const user = result.data
    setCurrentUser(user)
    toast.show({ status: 'success', message: `Logged in as ${user.displayName}` })
    navigate('/')
  }

  return (
    <SignedOutLayout title="Log in to your account">
      <form className={styles.fields} onSubmit={handleSubmit}>
        <PropertyRow label="Email" error={problems.email}>
          <TextInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </PropertyRow>

        <PropertyRow label="Password" error={problems.password}>
          <TextInput type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </PropertyRow>

        <div className={styles.actions}>
          <Button type="submit" variant="primary" disabled={sending}>
            Log in
          </Button>
          <Button disabled={sending} onClick={() => navigate('/signup')}>
            Sign up
          </Button>
        </div>
      </form>
    </SignedOutLayout>
  )
}

/**
 * What's missing before the form is worth sending, by field name: { email: 'Enter your email' }. Only checks that
 * both boxes are filled in; whether they're right is the server's answer.
 */
function findProblems(email, password) {
  const problems = {}
  if (email.trim() === '') {
    problems.email = 'Enter your email'
  }
  if (password === '') {
    problems.password = 'Enter your password'
  }
  return problems
}

export default LoginPage
