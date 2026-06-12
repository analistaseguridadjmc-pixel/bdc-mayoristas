import { useState } from 'react'
import { api } from '../../services/api'
import { useStore } from '../../store/useStore'

function StepIndicator({ paso }) {
  return (
    <div className="flex gap-1 px-4 py-2 bg-white border-b border-gray-100">
      {[1,2,3].map(p => (
        <div key={p} className={`h-1 flex-1 rounded-full transition-all
          ${p <= paso ? 'bg-bdc-brown' : 'bg-gray-200'}`} />
      ))}
    </div>
  )
}

export default function FlujoRetiro({ onVolver }) {
  const { token, ventaSeleccionada, vigilante, subPantalla, avanzarRetiro, cerrarDetalle } = useStore(s => s)
  const v = ventaSeleccionada

  // Estado del flujo
  const [paso, setPaso] = useState(1)
  const [facturaPresenta, setFacturaPresenta] = useState(null)
  const [retiraComprador, setRetiraComprador] = useState(null)
  const [autorizado, setAutorizado] = useState({ nombre: '', doc: '' })
  const [cartaAutorizacion, setCartaAutorizacion] = useState(false)
  const [itemsCantidades, setItemsCantidades] = useState(
    (v?.items || []).filter(i => i.cantidad_pendiente > 0).map(i => ({
      item_id: i.item_id,
      referencia: i.referencia,
      unidad: i.unidad,
      pendiente: i.cantidad_pendiente,
      cantidad: i.cantidad_pendiente
    }))
  )
  const [loading, setLoading] = useState(false)
  const [exito, setExito] = useState(null)
  const [error, setError] = useState('')

  const stepTitles = ['Verificar factura', 'Quién retira', 'Confirmar mercancía']

  // PASO 1: Verificar factura
  const renderPaso1 = () => (
    <div className="flex-1 p-4 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-xs text-blue-600 uppercase tracking-wider mb-1 font-medium">Acción requerida</div>
        <div className="text-base font-semibold text-gray-900">
          ¿El cliente presenta la factura original?
        </div>
        <div className="text-sm text-gray-500 mt-1">
          Factura <span className="font-mono font-semibold">{v?.numero_factura}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setFacturaPresenta(true); setPaso(2) }}
          className="bg-green-600 text-white rounded-xl py-6 text-base font-semibold active:scale-95 transition-transform"
        >
          ✓ Sí presenta
        </button>
        <button
          onClick={() => setFacturaPresenta(false)}
          className={`rounded-xl py-6 text-base font-semibold active:scale-95 transition-transform
            ${facturaPresenta === false ? 'bg-red-700 text-white ring-2 ring-red-400' : 'bg-red-100 text-red-700'}`}
        >
          ✗ No presenta
        </button>
      </div>

      {facturaPresenta === false && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-800 mb-1">⚠️ Protocolo sin factura</div>
          <div className="text-sm text-red-700">
            El cliente debe presentar la denuncia impresa de pérdida ante autoridades.
            Sin ese documento, <strong>no se autoriza el retiro</strong>.
          </div>
          <button
            onClick={onVolver}
            className="mt-3 w-full bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium"
          >
            Volver — no autorizar retiro
          </button>
        </div>
      )}
    </div>
  )

  // PASO 2: Quién retira
  const renderPaso2 = () => (
    <div className="flex-1 p-4 space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="text-xs text-blue-600 uppercase tracking-wider mb-1 font-medium">Acción requerida</div>
        <div className="text-base font-semibold text-gray-900">¿Quién retira la mercancía?</div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setRetiraComprador(true); setPaso(3) }}
          className="bg-bdc-brown text-white rounded-xl py-5 text-sm font-semibold active:scale-95 transition-transform"
        >
          👤 El mismo comprador
        </button>
        <button
          onClick={() => setRetiraComprador(false)}
          className={`rounded-xl py-5 text-sm font-semibold active:scale-95 transition-transform
            ${retiraComprador === false ? 'bg-orange-600 text-white ring-2 ring-orange-400' : 'bg-orange-100 text-orange-700'}`}
        >
          👥 Persona autorizada
        </button>
      </div>

      {retiraComprador === false && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-semibold text-orange-800 uppercase tracking-wider">
            ⚠️ Requiere carta de autorización física
          </div>
          <input
            className="w-full bg-white border border-orange-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-bdc-brown"
            placeholder="Nombre completo del autorizado *"
            value={autorizado.nombre}
            onChange={e => setAutorizado(p => ({ ...p, nombre: e.target.value }))}
          />
          <input
            className="w-full bg-white border border-orange-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-bdc-brown"
            placeholder="Número de documento *"
            type="number"
            value={autorizado.doc}
            onChange={e => setAutorizado(p => ({ ...p, doc: e.target.value }))}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-bdc-brown"
              checked={cartaAutorizacion} onChange={e => setCartaAutorizacion(e.target.checked)} />
            <span className="text-sm text-orange-800 font-medium">Carta de autorización recibida ✓</span>
          </label>
          <button
            onClick={() => {
              if (autorizado.nombre && autorizado.doc) setPaso(3)
              else setError('Ingrese nombre y documento del autorizado')
            }}
            disabled={!autorizado.nombre || !autorizado.doc}
            className="w-full bg-bdc-brown disabled:bg-gray-300 text-white rounded-xl py-3 text-sm font-semibold"
          >
            Continuar →
          </button>
        </div>
      )}
      {error && <div className="text-sm text-red-600 text-center">{error}</div>}
    </div>
  )

  // PASO 3: Confirmar ítems
  const renderPaso3 = () => (
    <div className="flex-1 p-4 space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <div className="text-xs text-amber-700 uppercase tracking-wider font-medium mb-0.5">Verificar mercancía</div>
        <div className="text-sm text-gray-700">Confirme cantidades antes de colocar el sello digital</div>
      </div>

      <div className="space-y-2">
        {itemsCantidades.map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">{item.referencia}</div>
              <div className="text-xs text-gray-500">{item.pendiente} {item.unidad} pendiente(s)</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setItemsCantidades(prev =>
                  prev.map((it,i) => i===idx ? {...it, cantidad: Math.max(0, it.cantidad-1)} : it)
                )}
                className="w-9 h-9 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:scale-95 flex items-center justify-center"
              >−</button>
              <span className="text-lg font-bold text-gray-900 w-8 text-center">{item.cantidad}</span>
              <button
                onClick={() => setItemsCantidades(prev =>
                  prev.map((it,i) => i===idx ? {...it, cantidad: Math.min(it.pendiente, it.cantidad+1)} : it)
                )}
                className="w-9 h-9 bg-gray-100 rounded-full text-lg font-bold text-gray-600 active:scale-95 flex items-center justify-center"
              >+</button>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">{error}</div>}

      <button
        onClick={ejecutarEntrega}
        disabled={loading || itemsCantidades.every(i => i.cantidad === 0)}
        className="w-full bg-green-600 disabled:bg-gray-300 text-white rounded-xl py-4 text-base font-semibold
                   flex items-center justify-center gap-2 active:scale-98 transition-transform"
      >
        {loading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : '✓'} {loading ? 'Registrando...' : 'Confirmar entrega y colocar sello'}
      </button>
    </div>
  )

  const ejecutarEntrega = async () => {
    setLoading(true)
    setError('')
    try {
      // Paso 1: confirmar llegada
      await api.confirmarLlegada(v.numero_factura, {
        retira_el_comprador: retiraComprador,
        nombre_autorizado: retiraComprador ? null : autorizado.nombre,
        doc_autorizado: retiraComprador ? null : autorizado.doc,
        factura_presentada: true
      }, token)

      // Paso 2: confirmar entrega
      const pendientesTotales = itemsCantidades.reduce((s,i) => s + (i.pendiente - i.cantidad), 0)
      const resultado = await api.confirmarEntrega(v.numero_factura, {
        tipo: pendientesTotales === 0 ? 'total' : 'parcial',
        retira_el_comprador: retiraComprador,
        nombre_autorizado: retiraComprador ? null : autorizado.nombre,
        doc_autorizado: retiraComprador ? null : autorizado.doc,
        carta_autorizacion: cartaAutorizacion,
        items_entregados: itemsCantidades
          .filter(i => i.cantidad > 0)
          .map(i => ({ item_venta_id: i.item_id, cantidad: i.cantidad }))
      }, token)

      setExito(resultado)
    } catch (e) {
      const msg = e.detail?.mensaje || e.detail?.msg || JSON.stringify(e.detail) || 'Error al registrar.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Pantalla éxito
  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center bg-white">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="font-mono text-xl font-bold text-gray-900 mb-2">{v.numero_factura}</div>
        <div className="text-sm text-gray-600 mb-4">
          {exito.entrega_completa ? 'Entrega total completada ✓' : `Retiro ${exito.retiros_usados}/3 registrado ✓`}
        </div>
        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left w-full">
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wider">Sello colocado por</div>
          <div className="text-sm font-semibold text-gray-900">{vigilante?.nombre}</div>
          <div className="text-xs text-gray-500">Carnet {vigilante?.carnet} · {vigilante?.empresa}</div>
        </div>
        {exito.alerta && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-left w-full">
            <div className="text-xs font-semibold text-orange-800">⚠️ {exito.alerta.mensaje}</div>
          </div>
        )}
        <button
          onClick={onVolver}
          className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold"
        >
          Volver a la venta
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onVolver} className="text-bdc-brown">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <div className="font-mono text-sm font-bold text-gray-900">{v?.numero_factura}</div>
          <div className="text-xs text-gray-500">Paso {paso}/3 — {stepTitles[paso-1]}</div>
        </div>
      </div>

      <StepIndicator paso={paso} />

      <div className="flex-1 overflow-y-auto">
        {paso === 1 && renderPaso1()}
        {paso === 2 && renderPaso2()}
        {paso === 3 && renderPaso3()}
      </div>
    </div>
  )
}
