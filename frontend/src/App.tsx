import './App.css'
import { useAuth } from './features/auth/components/AuthContext'
import { AuthScreen } from './features/auth/components/AuthScreen'
import { AnnotationScreen } from './features/annotation/components/AnnotationScreen'

function App() {
  const { isAuthenticated, logOut } = useAuth()

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return (
    <main className="app">
      <h1>cxr-labeller</h1>
      <AnnotationScreen />
      <button type="button" onClick={() => logOut()}>
        Log out
      </button>
    </main>
  )
}

export default App
