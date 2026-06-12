import { useStore } from '../../store/useStore'
import FlujoRetiro from '../flujos/FlujoRetiro'

function Pill({ value, label, color }) {
  const colors = {
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-green-50 text-green-700',
    gray: 'bg-gray-100 text-gray-600'
  }
  return (
    <div className={`flex-1 rounded-xl p-2.5 text-center ${colors[color] || colors.gray}`}>
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs mt-0.5 opacity-80">{label}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function RetiroCard({ retiro, numero }) {
  const iniciales = retiro.vigilante_nombre
    ? retiro.vigilante_nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()
    : '?'
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 last:mb-0">
      <div className="bg-gray-50 px-3 py-2 flex justify-between items-center border-b border-gray-200">
        <span className="text-sm font-semibold text-gray-900">
          Retiro {retiro.numero_retiro} — {retiro.tipo === 'total' ? 'Total' : 'Parcial'}
        </span>
        {retiro.sello_colocado ? (
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">✓ Sellado</span>
        ) : (
          <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">Pendiente</span>
        )}
      </div>
      {/* Firma vigilante */}
      <div className="px-3 py-2.5 flex items-center gap-3 border-b border-gray-100 bg-amber-50/40">
        <div className="w-9 h-9 rounded-full bg-bdc-brown flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {iniciales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-900 truncate">{retiro.vigilante_nombre}</div>
          <div className="text-xs text-gray-500">
            Carnet {retiro.vigilante_carnet} · {retiro.vigilante_empresa}
          </div>
        </div>
        <div className="text-xs text-gray-400 font-mono text-right flex-shrink-0">
          {retiro.fecha ? new Date(retiro.fecha).toLocaleDateString('es-CO', {day:'2-digit',month:'short'}) : ''}
          <br/>
          {retiro.fecha ? new Date(retiro.fecha).toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'}) : ''}
        </div>
      </div>
      {/* Info retiro */}
      <div className="px-3 py-2.5 text-xs text-gray-600 space-y-1">
        <div>
          {retiro.retira_comprador
            ? '👤 Retiró el comprador · Factura original presentada ✓'
            : `👥 Autorizado: ${retiro.nombre_autorizado} · Doc: ${retiro.doc_autorizado}${retiro.carta_autorizacion ? ' · Carta ✓' : ''}`
          }
        </div>
        {retiro.items && retiro.items.length > 0 && (
          <div className="pt-1 border-t border-gray-100 space-y-0.5">
            {retiro.items.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-500">{item.referencia}</span>
                <span className="font-medium text-gray-800">{item.cantidad} {item.unidad}</span>
              </div>
            ))}
          </div>
        )}
        {retiro.observaciones && (
          <div className="pt-1 border-t border-gray-100 text-gray-500 italic">
            "{retiro.observaciones}"
          </div>
        )}
      </div>
    </div>
  )
}

function RetiroVacio({ numero }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-xl px-3 py-4 text-center mb-3 last:mb-0">
      <div className="text-gray-400 text-xs">Retiro {numero} disponible</div>
      <div className="text-gray-300 text-xs mt-0.5">Quedará firmado con su carnet al registrarlo</div>
    </div>
  )
}

export default function VentaDetalle({ onVolver }) {
  const { ventaSeleccionada, vigilante, abrirRetiro, subPantalla } = useStore(s => s)

  // Si está en flujo de retiro, mostrar ese componente
  if (subPantalla === 'retiro' || subPantalla === 'retiro-paso2' || subPantalla === 'retiro-paso3') {
    return <FlujoRetiro onVolver={() => useStore.getState().avanzarRetiro('detalle') || useStore.setState({ subPantalla: 'detalle' })} />
  }

  const v = ventaSeleccionada
  if (!v) return null

  const horas = v.control?.horas_restantes
  const pillTiempoColor = horas < 1 ? 'red' : horas < 4 ? 'orange' : 'green'
  const retirosUsados = v.control?.retiros_usados || 0
  const pillRetirosColor = retirosUsados >= 3 ? 'red' : retirosUsados >= 2 ? 'orange' : 'gray'
  const pct = v.totales?.porcentaje || 0

  const bloqueado = v.control?.formato_vencido || !v.control?.puede_recibir_retiro

  const retirosExistentes = v.historial_retiros || []
  const retirosDisponibles = 3 - retirosExistentes.length

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Back */}
      <button onClick={onVolver}
        className="bg-white px-4 py-2.5 flex items-center gap-2 border-b border-gray-100 text-bdc-brown text-sm font-medium sticky top-0 z-10">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Volver a pendientes
      </button>

      {/* Encabezado factura */}
      <div className="bg-white px-4 py-4 mb-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xl font-bold text-gray-900">{v.numero_factura}</span>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium
            ${v.estado === 'entregada' ? 'bg-green-100 text-green-700' :
              v.estado === 'vencida' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
            {v.estado === 'facturada' ? 'Facturada' :
             v.estado === 'en_separacion' ? 'En separación' :
             v.estado === 'entrega_parcial' ? 'Entrega parcial' :
             v.estado === 'entregada' ? 'Entregada' : 'Vencida'}
          </span>
        </div>
        <div className="text-2xl font-semibold text-bdc-brown">
          ${Number(v.venta?.monto_total).toLocaleString('es-CO')}
        </div>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <div>Vendida el {v.venta?.fecha ? new Date(v.venta.fecha).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</div>
          <div>JDT: {v.venta?.jdt_nombre || '—'}</div>
        </div>

        {/* Alerta SAGRILAFT */}
        {v.alerta_sagrilaft && (
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
            <div className="text-xs font-semibold text-orange-800">⚠️ Requiere formato SAGRILAFT</div>
            <div className="text-xs text-orange-700 mt-0.5">Verificar antes de autorizar retiro</div>
          </div>
        )}
      </div>

      {/* Pills */}
      <div className="bg-white px-4 py-3 flex gap-2 mb-1">
        <Pill value={horas !== null ? `${horas}h` : '—'} label="Tiempo" color={pillTiempoColor} />
        <Pill value={`${retirosUsados}/3`} label="Retiros" color={pillRetirosColor} />
        <Pill value={`${pct}%`} label="Entregado" color={pct === 100 ? 'green' : pct > 0 ? 'orange' : 'gray'} />
      </div>

      {/* Cliente */}
      <div className="bg-white px-4 py-4 mb-1">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Cliente</div>
        <InfoRow label="Razón social" value={v.cliente?.nombre} />
        <InfoRow label="NIT" value={v.cliente?.nit} />
        <InfoRow label="Representante" value={v.cliente?.representante} />
        <InfoRow label="Teléfono" value={v.cliente?.telefono} />
      </div>

      {/* Mercancía */}
      <div className="bg-white px-4 py-4 mb-1">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Mercancía</div>
          <div className="text-xs text-gray-500">{v.totales?.entregado}/{v.totales?.facturado} unidades</div>
        </div>
        {/* Barra progreso */}
        <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
          <div className={`h-full rounded-full transition-all
            ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-orange-400' : 'bg-gray-300'}`}
            style={{ width: `${pct}%` }} />
        </div>
        {/* Tabla ítems */}
        <div className="grid grid-cols-4 gap-1 mb-2 text-xs text-gray-400 font-medium">
          <div>Referencia</div>
          <div className="text-right">Facturado</div>
          <div className="text-right">Entregado</div>
          <div className="text-right">Pendiente</div>
        </div>
        {(v.items || []).map((item, i) => (
          <div key={i} className="grid grid-cols-4 gap-1 py-1.5 border-t border-gray-50 text-xs">
            <div>
              <div className="font-medium text-gray-900">{item.referencia}</div>
              <div className="text-gray-400">{item.unidad}</div>
            </div>
            <div className="text-right text-gray-600">{item.cantidad_facturada}</div>
            <div className={`text-right font-medium ${item.cantidad_entregada === item.cantidad_facturada ? 'text-green-600' : 'text-gray-700'}`}>
              {item.cantidad_entregada}
            </div>
            <div className={`text-right font-medium ${item.cantidad_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {item.cantidad_pendiente}
            </div>
          </div>
        ))}
      </div>

      {/* Trazabilidad */}
      <div className="bg-white px-4 py-4 mb-1">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
          Trazabilidad — Formato GVM-001 #{v.control?.numero_formato || 1}
        </div>
        {retirosExistentes.map((r, i) => <RetiroCard key={i} retiro={r} numero={i+1} />)}
        {Array.from({ length: Math.max(0, retirosDisponibles) }).map((_, i) => (
          <RetiroVacio key={i} numero={retirosExistentes.length + i + 1} />
        ))}
      </div>

      {/* Quién registró */}
      <div className="bg-white px-4 py-4 mb-1">
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Registrado por</div>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <div className="w-10 h-10 bg-bdc-brown rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {(v.registrado_por?.nombre || 'V').split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{v.registrado_por?.nombre}</div>
            <div className="text-xs text-gray-500">
              Carnet {v.registrado_por?.carnet} · {v.registrado_por?.empresa}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">Info entregada por JDT: {v.venta?.jdt_nombre}</div>
          </div>
        </div>
      </div>

      {/* Acción principal */}
      <div className="bg-white px-4 py-4 space-y-2 mb-1">
        {bloqueado ? (
          <div className="bg-gray-100 rounded-xl p-3.5 text-center">
            <div className="text-sm font-medium text-gray-500">
              {v.control?.formato_vencido ? '⏰ Plazo de 72h vencido' : '🔒 Formato GVM-001 agotado'}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {v.control?.formato_vencido ? 'Informar al JDT/SDT' : 'Solicitar formato adicional al JDT/SDT'}
            </div>
          </div>
        ) : (
          <>
            <button
              onClick={() => abrirRetiro(null)}
              className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold
                         flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Registrar llegada del cliente
            </button>
            <div className="text-xs text-gray-400 text-center">
              Retiro {retirosExistentes.length + 1}/3 · firmará con carnet {vigilante?.carnet}
            </div>
          </>
        )}

        <button
          onClick={() => alert('Reportar anomalía sobre esta venta')}
          className="w-full bg-red-50 text-red-700 border border-red-200 rounded-xl py-3 text-sm font-medium
                     flex items-center justify-center gap-2 active:scale-98 transition-transform"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Reportar anomalía
        </button>
      </div>
      <div className="h-4" />
    </div>
  )
}
