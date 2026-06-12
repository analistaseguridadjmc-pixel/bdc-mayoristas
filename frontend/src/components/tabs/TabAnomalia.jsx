import { useState } from 'react'
import { api } from '../../services/api'
import { useStore } from '../../store/useStore'

const TIPOS = [
  { value: 'mercancia_sin_factura', label: 'Mercancía sin factura' },
  { value: 'retiro_no_autorizado', label: 'Retiro no autorizado' },
  { value: 'venta_sin_cliente', label: 'Venta sin presencia del cliente' },
  { value: 'discrepancia_cantidades', label: 'Discrepancia en cantidades' },
  { value: 'formato_agotado', label: 'Formato GVM-001 agotado con pendiente' },
  { value: 'otro', label: 'Otra novedad' },
]

export default function TabAnomalia() {
  const { token, vigilante } = useStore(s => s)
  const [form, setForm] = useState({ tipo: '', numero_factura: '', descripcion: '' })
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [error, setError] = useState('')

  const esValido = form.tipo && form.descripcion.trim().length >= 10

  const enviar = async () => {
    setLoading(true)
    setError('')
    try {
      await api.reportarAnomalia({
        tipo: form.tipo,
        numero_factura: form.numero_factura.trim().toUpperCase() || null,
        descripcion: form.descripcion.trim()
      }, token)
      setEnviado(true)
    } catch (e) {
      setError(e.detail?.mensaje || 'Error al enviar el reporte.')
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center bg-gray-50">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-base font-semibold text-gray-900 mb-2">Anomalía reportada</div>
        <div className="text-sm text-gray-500 mb-6">Quedó registrada en la auditoría con su firma</div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-6 w-full text-left">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Reportado por</div>
          <div className="text-sm font-semibold text-gray-900">{vigilante?.nombre}</div>
          <div className="text-xs text-gray-500">Carnet {vigilante?.carnet} · {vigilante?.empresa}</div>
        </div>
        <button onClick={() => { setEnviado(false); setForm({ tipo:'', numero_factura:'', descripcion:'' }) }}
          className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold">
          Reportar otra novedad
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-6">
      <div className="p-4 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-800 mb-1">⚠️ Reporte de novedad</div>
          <div className="text-xs text-red-700">
            Todo reporte queda registrado en la auditoría con su nombre, carnet y timestamp exacto.
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Tipo de novedad <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {TIPOS.map(t => (
              <button key={t.value}
                onClick={() => setForm(p => ({ ...p, tipo: t.value }))}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${form.tipo === t.value
                    ? 'bg-red-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 active:bg-gray-50'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Factura (opcional) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Factura relacionada (si aplica)
          </label>
          <input
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono
                       text-gray-900 outline-none focus:border-red-400 uppercase"
            placeholder="Ej: FV-20240312"
            value={form.numero_factura}
            onChange={e => setForm(p => ({ ...p, numero_factura: e.target.value.toUpperCase() }))}
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Descripción de la novedad <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                       text-gray-900 outline-none focus:border-red-400 resize-none"
            rows={4}
            placeholder="Describa con detalle lo que ocurrió, quiénes estaban presentes y qué acción tomó..."
            value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          />
          <div className="text-xs text-gray-400 mt-1 text-right">{form.descripcion.length} caracteres (mínimo 10)</div>
        </div>

        {/* Firma visible */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 bg-bdc-brown rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {(vigilante?.nombre || 'V').split(' ').slice(0,2).map(n=>n[0]).join('')}
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">Firmará como</div>
            <div className="text-sm font-medium text-gray-900">{vigilante?.nombre}</div>
            <div className="text-xs text-gray-500">Carnet {vigilante?.carnet}</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button onClick={enviar} disabled={!esValido || loading}
          className="w-full bg-red-600 disabled:bg-gray-300 text-white rounded-xl py-4 text-sm font-semibold
                     flex items-center justify-center gap-2 active:scale-98 transition-transform">
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          )}
          {loading ? 'Enviando...' : 'Enviar reporte'}
        </button>
      </div>
    </div>
  )
}
