import { useState } from 'react'
import './App.css'
import { useAuth } from './features/auth/components/AuthContext'
import { AuthScreen } from './features/auth/components/AuthScreen'

function App() {
  const [count, setCount] = useState(0)
  const { isAuthenticated, logOut } = useAuth()

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return (
    <main className="app">
      <h1>cxr-labeller</h1>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        Count: {count}
      </button>
      <button type="button" onClick={() => logOut()}>
        Log out
      </button>
    </main>
  )
}

export default App
