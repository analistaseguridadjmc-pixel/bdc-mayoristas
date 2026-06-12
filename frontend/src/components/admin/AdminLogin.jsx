import { useState } from 'react'
import { api } from '../../services/api'
import { useStore } from '../../store/useStore'

export default function AdminLogin({ onBack }) {
  const setAdminAuth = useStore(s => s.setAdminAuth)
  const [form, setForm] = useState({ documento: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!form.documento || !form.password) { setError('Complete todos los campos.'); return }
    setLoading(true); setError('')
    try {
      const data = await api.adminLogin(form)
      setAdminAuth(data.token, data.usuario, data.tienda)
    } catch (e) {
      setError(e.detail?.mensaje || 'Credenciales incorrectas.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-bdc-brown rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white">Panel Administrativo</h1>
          <p className="text-sm text-gray-400 mt-1">Bodegas del Canasto</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Documento</label>
            <input type="text"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-bdc-brown transition-colors"
              placeholder="Número de documento"
              value={form.documento}
              onChange={e => setForm(p => ({ ...p, documento: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5">Contraseña</label>
            <input type="password"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-base text-white outline-none focus:border-bdc-brown transition-colors"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
          {error && <div className="bg-red-900/40 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>}
          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-60 transition-all">
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </div>
        <button onClick={onBack} className="w-full text-center text-xs text-gray-500 mt-4 py-2 hover:text-gray-300 transition-colors">
          ← Volver al login de vigilantes
        </button>
      </div>
    </div>
  )
}
