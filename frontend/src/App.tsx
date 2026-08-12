import { useCallback, useMemo, useState } from 'react'
import { createClient } from './api/client.ts'
import { Workspace } from './components/Workspace.tsx'
import { TokenGate } from './components/TokenGate.tsx'
import { useBootstrap } from './hooks/useBootstrap.ts'
import { clearToken, loadToken, saveToken } from './lib/token.ts'
import styles from './App.module.css'

function Session({
  token,
  onUnauthorized,
  onSignOut,
}: {
  token: string
  onUnauthorized: () => void
  onSignOut: () => void
}) {
  const client = useMemo(() => createClient(token), [token])
  const bootstrap = useBootstrap(client, onUnauthorized)

  if (bootstrap.status === 'loading') {
    return <p className={styles.notice}>Loading pairs…</p>
  }
  if (bootstrap.status === 'error') {
    // A non-401 failure (server down, CORS, offline) leaves a valid token in
    // place, so the gate needs an explicit way back rather than a dead end.
    return (
      <div className={styles.notice}>
        <p>Could not load the session: {bootstrap.message}</p>
        <button type="button" className={styles.retry} onClick={onSignOut}>
          Use a different token
        </button>
      </div>
    )
  }

  return (
    <Workspace
      client={client}
      reviewer={bootstrap.reviewer}
      primitives={bootstrap.primitives}
      pairs={bootstrap.pairs}
      shuffledPairs={bootstrap.shuffledPairs}
      judgements={bootstrap.judgements}
      onUnauthorized={onUnauthorized}
    />
  )
}

function App() {
  const [token, setToken] = useState<string | null>(loadToken)
  const [rejected, setRejected] = useState(false)

  const onUnauthorized = useCallback(() => {
    clearToken()
    setToken(null)
    setRejected(true)
  }, [])

  const onSignOut = useCallback(() => {
    clearToken()
    setToken(null)
    setRejected(false)
  }, [])

  const onSubmit = useCallback((value: string) => {
    saveToken(value)
    setRejected(false)
    setToken(value)
  }, [])

  if (token === null) {
    return (
      <TokenGate
        message={rejected ? 'That token was rejected. Try another.' : null}
        onSubmit={onSubmit}
      />
    )
  }

  // Remount on token change so a new reviewer never inherits the previous
  // reviewer's loaded session.
  return (
    <Session
      key={token}
      token={token}
      onUnauthorized={onUnauthorized}
      onSignOut={onSignOut}
    />
  )
}

export default App
