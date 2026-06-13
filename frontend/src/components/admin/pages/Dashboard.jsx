import { useEffect, useState } from 'react'
import { api } from '../../../services/api'
import { useStore } from '../../../store/useStore'

function KpiCard({ label, value, color, icon, sub }) {
  const colors = {
    blue:   'bg-blue-50 text-blue-600 border-blue-100',
    red:    'bg-red-50 text-red-600 border-red-100',
    green:  'bg-green-50 text-green-600 border-green-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    brown:  'bg-amber-50 text-amber-700 border-amber-100',
  }
  return (
    <div className={`bg-white rounded-2xl border p-5 flex items-start gap-4 ${colors[color]}`}>
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
        <div className="text-sm font-medium text-gray-600 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
      </div>
    </div>
  )
}

const INTERVALO_MS = 5 * 60 * 1000

export default function Dashboard() {
  const token = useStore(s => s.token)
  const [data, setData] = useState(null)
  const [tiendas, setTiendas] = useState([])
  const [tiendaFiltro, setTiendaFiltro] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)
  const [hace, setHace] = useState('')

  const cargar = async (tc) => {
    setLoading(true)
    try {
      const [d, ts] = await Promise.all([
        api.adminDashboard(token, tc || undefined),
        tiendas.length === 0 ? api.adminTiendas(token) : Promise.resolve(null)
      ])
      setData(d)
      if (ts) setTiendas(ts)
      setUltimaActualizacion(new Date())
      setError('')
    } catch (e) {
      setError('Error al cargar el dashboard.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    cargar('')
    const intervalo = setInterval(() => {
      setTiendaFiltro(prev => { cargar(prev); return prev })
    }, INTERVALO_MS)
    return () => clearInterval(intervalo)
  }, [])

  useEffect(() => {
    if (!ultimaActualizacion) return
    const tick = setInterval(() => {
      const min = Math.floor((Date.now() - ultimaActualizacion) / 60000)
      setHace(min === 0 ? 'ahora mismo' : `hace ${min} min`)
    }, 30000)
    setHace('ahora mismo')
    return () => clearInterval(tick)
  }, [ultimaActualizacion])

  const handleFiltro = (codigo) => {
    setTiendaFiltro(codigo)
    cargar(codigo)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-gray-400 text-sm">Cargando dashboard...</div>
    </div>
  )

  if (error) return (
    <div className="p-8">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>
    </div>
  )

  const { kpis, por_tienda, proximas_vencer, anomalias_recientes } = data

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen operacional en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtro de tienda */}
          <select
            value={tiendaFiltro}
            onChange={e => handleFiltro(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium outline-none focus:border-bdc-brown">
            <option value="">Todas las tiendas</option>
            {tiendas.map(t => (
              <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            {hace && <span className="text-xs text-gray-400 hidden sm:block">Actualizado {hace}</span>}
            <button onClick={() => cargar(tiendaFiltro)}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {tiendaFiltro && (
        <div className="bg-bdc-brown/10 border border-bdc-brown/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
          <span className="text-sm font-medium text-bdc-brown">
            Filtrando: {tiendas.find(t => t.codigo === tiendaFiltro)?.nombre || tiendaFiltro}
          </span>
          <button onClick={() => handleFiltro('')} className="text-xs text-bdc-brown underline hover:no-underline">
            Ver todas
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="Ventas activas" value={kpis.ventas_activas} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>}
        />
        <KpiCard label="Ventas vencidas (+72h)" value={kpis.ventas_vencidas} color="red"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Entregadas" value={kpis.ventas_entregadas} color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <KpiCard label="Retiros hoy" value={kpis.retiros_hoy} color="brown"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" /></svg>}
          sub="Completados hoy"
        />
        <KpiCard label="Anomalías hoy" value={kpis.anomalias_hoy} color="orange"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
          sub="Reportadas hoy"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Por tienda */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Estado por tienda</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {por_tienda.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">Sin datos para esta tienda</div>
            ) : por_tienda.map(t => (
              <div key={t.codigo} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{t.tienda}</div>
                  <div className="text-xs text-gray-400 font-mono">{t.codigo}</div>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-semibold">{t.activas} activas</span>
                  {t.vencidas > 0 && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-semibold">{t.vencidas} vencidas</span>}
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">{t.entregadas} entregadas</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas a vencer */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Próximas a vencer</h2>
            <span className="text-xs text-gray-400">menos de 12 horas</span>
          </div>
          {proximas_vencer.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-gray-400">Sin ventas próximas a vencer</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {proximas_vencer.map(v => (
                <div key={v.numero_factura} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono font-semibold text-gray-900">{v.numero_factura}</div>
                    <div className="text-xs text-gray-500">{v.cliente} · {v.tienda}</div>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-xl ${
                    v.horas_restantes < 4 ? 'bg-red-100 text-red-700' :
                    v.horas_restantes < 8 ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {v.horas_restantes}h
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anomalías recientes */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Anomalías recientes</h2>
        </div>
        {anomalias_recientes.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Sin anomalías registradas</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  {['Fecha','Tipo','Vigilante','Tienda','Detalle'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {anomalias_recientes.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(a.created_at).toLocaleString('es-CO', { dateStyle:'short', timeStyle:'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-lg font-medium">
                        {a.evento.replace('ANOMALIA_','').replace(/_/g,' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{a.vigilante}</td>
                    <td className="px-4 py-3 text-gray-500">{a.tienda}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {typeof a.detalle === 'object' ? a.detalle?.descripcion || JSON.stringify(a.detalle) : a.detalle}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
