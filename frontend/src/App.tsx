import './App.css'
import { useAuth } from './features/auth/components/AuthContext'
import { AuthScreen } from './features/auth/components/AuthScreen'
import { AnnotationScreen } from './features/annotation/components/AnnotationScreen'

function App() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <AuthScreen />
  }

  return (
    <main className="app">
      <AnnotationScreen />
    </main>
  )
}

export default App
