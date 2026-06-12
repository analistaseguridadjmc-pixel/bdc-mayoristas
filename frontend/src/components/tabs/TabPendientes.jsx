import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import { useStore } from '../../store/useStore'
import VentaDetalle from '../detail/VentaDetalle'

function hrsColor(h) {
  if (h === null || h === undefined) return 'text-gray-500'
  if (h < 1) return 'text-red-600'
  if (h < 4) return 'text-orange-600'
  return 'text-green-700'
}

function VentaCard({ venta, onClick }) {
  const urgente = venta.horas_restantes < 1
  const advertencia = venta.horas_restantes < 4 && venta.horas_restantes >= 1
  return (
    <div
      onClick={onClick}
      className={`bg-white px-4 py-3.5 border-b border-gray-100 cursor-pointer active:bg-gray-50 
        flex items-center justify-between gap-3 transition-colors
        ${urgente ? 'border-l-4 border-l-red-500' : advertencia ? 'border-l-4 border-l-orange-400' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <div className="font-mono text-sm font-semibold text-gray-900">{venta.numero_factura}</div>
        <div className="text-xs text-gray-500 mt-0.5 truncate">{venta.cliente_nombre}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          JDT: {venta.jdt_nombre || '—'} · ${Number(venta.monto_total).toLocaleString('es-CO')}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className={`text-sm font-semibold ${hrsColor(venta.horas_restantes)}`}>
          {venta.horas_restantes !== null ? `${venta.horas_restantes}h` : '—'}
          {urgente && ' ⚡'}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{venta.retiros_usados}/3 retiros</div>
        <div className="text-gray-300 mt-1">
          <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default function TabPendientes() {
  const { token, tienda, subPantalla, ventaSeleccionada, abrirDetalle, cerrarDetalle } = useStore(s => s)
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])

  const cargarVentas = async () => {
    try {
      const data = await api.ventasActivas(token)
      setVentas(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargarVentas() }, [])

  const onBusqueda = async (v) => {
    setBusqueda(v)
    if (v.length < 2) { setSugerencias([]); return }
    try {
      const data = await api.buscarFactura(v, token)
      setSugerencias(data)
    } catch { setSugerencias([]) }
  }

  const seleccionarVenta = async (factura) => {
    try {
      const data = await api.detalleVenta(factura, token)
      abrirDetalle(data)
      setBusqueda('')
      setSugerencias([])
    } catch (e) {
      alert(e.detail?.mensaje || 'Factura no encontrada.')
    }
  }

  // Mostrar detalle si hay venta seleccionada
  if (subPantalla === 'detalle' || subPantalla === 'retiro' ||
      subPantalla === 'retiro-paso2' || subPantalla === 'retiro-paso3') {
    return <VentaDetalle onVolver={() => { cerrarDetalle(); cargarVentas() }} />
  }

  const listaFiltrada = busqueda.length >= 2 ? sugerencias : ventas

  return (
    <div className="flex flex-col h-full">
      {/* Buscador */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
          Buscar por número de factura
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono text-gray-900 outline-none focus:border-bdc-brown uppercase"
            placeholder="Ej: FV-20240312"
            value={busqueda}
            onChange={e => onBusqueda(e.target.value.toUpperCase())}
            autoCapitalize="characters"
          />
          <button
            onClick={() => busqueda && seleccionarVenta(busqueda)}
            className="bg-bdc-brown text-white rounded-xl px-4 py-2.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {busqueda.length < 2 && (
          <div className="px-4 pt-3 pb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
            Ventas activas — toca para ver trazabilidad
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Cargando ventas...
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="text-sm">Sin ventas pendientes</p>
          </div>
        ) : (
          listaFiltrada.map(v => (
            <VentaCard key={v.numero_factura} venta={v}
              onClick={() => seleccionarVenta(v.numero_factura)} />
          ))
        )}
      </div>
    </div>
  )
}
