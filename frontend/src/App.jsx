import { useStore } from './store/useStore'
import Login from './components/Login'
import AppShell from './components/AppShell'
import AdminShell from './components/admin/AdminShell'

export default function App() {
  const pantalla = useStore(s => s.pantalla)
  if (pantalla === 'admin') return <AdminShell />
  if (pantalla === 'app') return <AppShell />
  return <Login />
}
