import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { useStore } from '../store/useStore'
import AdminLogin from './admin/AdminLogin'

export default function Login() {
  const setAuth = useStore(s => s.setAuth)
  const [form, setForm] = useState({ documento: '', password: '', tienda_codigo: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modoAdmin, setModoAdmin] = useState(false)
  const [tiendas, setTiendas] = useState([])

  useEffect(() => {
    api.tiendas().then(setTiendas).catch(() => {})
  }, [])

  if (modoAdmin) return <AdminLogin onBack={() => setModoAdmin(false)} />

  const handleLogin = async () => {
    if (!form.documento || !form.password || !form.tienda_codigo) {
      setError('Complete todos los campos.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await api.login(form)
      setAuth(data.token, data.sesion_id, data.vigilante, data.tienda)
    } catch (e) {
      const msg = e.detail?.mensaje || e.detail || 'Error al iniciar sesión.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bdc-light flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-bdc-brown rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Control Mayoristas</h1>
          <p className="text-sm text-gray-500 mt-1">Bodegas del Canasto</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Número de cédula
            </label>
            <input
              type="number"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:border-bdc-brown transition-colors"
              placeholder="Ej: 1020456789"
              value={form.documento}
              onChange={e => setForm(p => ({ ...p, documento: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:border-bdc-brown transition-colors"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              Tienda asignada
            </label>
            <select
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 outline-none focus:border-bdc-brown transition-colors"
              value={form.tienda_codigo}
              onChange={e => setForm(p => ({ ...p, tienda_codigo: e.target.value }))}
            >
              <option value="">Seleccionar tienda...</option>
              {tiendas.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold
                       disabled:opacity-60 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
            )}
            {loading ? 'Iniciando turno...' : 'Iniciar turno'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contraseña de prueba: <span className="font-mono">bdc2024</span>
        </p>
        <button onClick={() => setModoAdmin(true)}
          className="w-full text-center text-xs text-gray-400 mt-3 py-2 hover:text-bdc-brown transition-colors">
          Acceso administrativo →
        </button>
      </div>
    </div>
  )
}
