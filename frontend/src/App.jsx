import { useStore } from './store/useStore'
import Login from './components/Login'
import AppShell from './components/AppShell'

export default function App() {
  const pantalla = useStore(s => s.pantalla)
  return pantalla === 'login' ? <Login /> : <AppShell />
}
