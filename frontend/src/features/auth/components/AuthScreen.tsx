import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'
import '../styles/AuthScreen.css'

export function AuthScreen() {
  const { signUp, logIn } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await signUp(username, email, password)
      } else {
        await logIn(username, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-screen">
      <h1>cxr-labeller</h1>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {mode === 'signup' && (
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        )}
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {mode === 'signup' ? 'Sign up' : 'Log in'}
        </button>
      </form>
      <button
        type="button"
        className="auth-toggle"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'signup' : 'login'))
          setError(null)
        }}
      >
        {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
      </button>
    </main>
  )
}
