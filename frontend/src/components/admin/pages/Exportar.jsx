import { useState } from 'react'
import { api } from '../../../services/api'
import { useStore } from '../../../store/useStore'

function ExportCard({ title, description, icon, color, onExport, loading }) {
  const colors = {
    green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600', btn: 'bg-green-600 hover:bg-green-700' },
    blue:  { bg: 'bg-blue-50',  border: 'border-blue-200',  icon: 'text-blue-600',  btn: 'bg-blue-600 hover:bg-blue-700'  },
  }
  const c = colors[color]
  return (
    <div className={`bg-white rounded-2xl border ${c.border} p-6`}>
      <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
        <span className={c.icon}>{icon}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <button onClick={onExport} disabled={loading}
        className={`w-full ${c.btn} text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2`}>
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        )}
        {loading ? 'Generando...' : 'Descargar Excel'}
      </button>
    </div>
  )
}

export default function Exportar() {
  const token = useStore(s => s.token)
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const [mes, setMes] = useState(mesActual)
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [loadingRetiros, setLoadingRetiros] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const exportar = async (tipo) => {
    const setLoading = tipo === 'ventas' ? setLoadingVentas : setLoadingRetiros
    setLoading(true); setError(''); setExito('')
    try {
      if (tipo === 'ventas') await api.adminExportarVentas(mes, token)
      else await api.adminExportarRetiros(mes, token)
      setExito(`Archivo ${tipo}_${mes}.xlsx descargado correctamente.`)
    } catch (e) {
      setError(e.detail?.mensaje || `Error al exportar ${tipo}.`)
    } finally { setLoading(false) }
  }

  const mesesOpciones = []
  for (let i = 0; i < 12; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    mesesOpciones.push({ val, label })
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exportar datos</h1>
        <p className="text-sm text-gray-500 mt-1">Descarga reportes en formato Excel</p>
      </div>

      {/* Selector de mes */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">Período a exportar</label>
        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown w-64"
          value={mes} onChange={e => setMes(e.target.value)}>
          {mesesOpciones.map(m => (
            <option key={m.val} value={m.val}>{m.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700">{error}</div>}
      {exito && <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 text-sm text-green-700">{exito}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExportCard
          title="Ventas del mes"
          description="Todas las ventas mayoristas del período seleccionado con estado, cliente, monto, vigilante y retiros."
          color="green"
          loading={loadingVentas}
          onExport={() => exportar('ventas')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          }
        />
        <ExportCard
          title="Historial de retiros"
          description="Todos los retiros del período: factura, cliente, tienda, vigilante, tipo de retiro, sello y carta de autorización."
          color="blue"
          loading={loadingRetiros}
          onExport={() => exportar('retiros')}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
            </svg>
          }
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Nota sobre los archivos</p>
            <p className="text-sm text-amber-700 mt-1">Los archivos Excel incluyen formato de color, encabezados y filas alternadas para facilitar la lectura. Si no hay datos en el período seleccionado, el archivo se descargará vacío.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
