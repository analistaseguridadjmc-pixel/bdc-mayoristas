import { useState, useEffect, useRef } from 'react'
import { api } from '../../services/api'
import { useStore } from '../../store/useStore'

export default function TabRegistrar() {
  const { token, vigilante, subPantalla, ultimaFactura } = useStore(s => s)
  const [form, setForm] = useState({
    numero_factura: '', jdt_nombre: '', monto_total: '',
    sagrilaft_diligenciado: false, observaciones: ''
  })
  const [modoCliente, setModoCliente] = useState('existente')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [busqCliente, setBusqCliente] = useState('')
  const [sugerenciasClientes, setSugerenciasClientes] = useState([])
  const [clienteNuevo, setClienteNuevo] = useState({ razon_social: '', nit: '', nombre_rep: '', telefono: '' })
  const [items, setItems] = useState([{ referencia: '', descripcion: '', unidad: 'UND', cantidad: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const busqRef = useRef(null)

  const monto = parseFloat(form.monto_total) || 0
  const requiereSagrilaft = monto >= 40_000_000

  const buscarClientes = async (q) => {
    setBusqCliente(q)
    if (q.length < 2) { setSugerenciasClientes([]); return }
    try {
      const data = await api.buscarClientes(q, token)
      setSugerenciasClientes(data)
    } catch { setSugerenciasClientes([]) }
  }

  const seleccionarCliente = (c) => {
    setClienteSeleccionado(c)
    setSugerenciasClientes([])
    setBusqCliente('')
  }

  const agregarItem = () =>
    setItems(prev => [...prev, { referencia: '', descripcion: '', unidad: 'UND', cantidad: '' }])

  const quitarItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  const updateItem = (idx, field, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))

  const esValido = () => {
    if (!form.numero_factura.trim() || !form.jdt_nombre.trim() || !monto) return false
    if (requiereSagrilaft && !form.sagrilaft_diligenciado) return false
    if (modoCliente === 'existente' && !clienteSeleccionado) return false
    if (modoCliente === 'nuevo' && (!clienteNuevo.razon_social || !clienteNuevo.nit)) return false
    if (!items.every(i => i.referencia.trim() && parseInt(i.cantidad) > 0)) return false
    return true
  }

  const registrar = async () => {
    if (!esValido()) return
    setLoading(true)
    setError('')
    try {
      const payload = {
        numero_factura: form.numero_factura.toUpperCase().trim(),
        jdt_nombre: form.jdt_nombre.trim(),
        monto_total: monto,
        sagrilaft_diligenciado: form.sagrilaft_diligenciado,
        observaciones: form.observaciones || null,
        items: items.map(i => ({
          referencia: i.referencia.trim().toUpperCase(),
          descripcion: i.descripcion || i.referencia,
          unidad: i.unidad,
          cantidad: parseInt(i.cantidad),
          precio: 0
        }))
      }
      if (modoCliente === 'existente') payload.cliente_id = clienteSeleccionado.id
      else payload.cliente_nuevo = clienteNuevo

      await api.registrarVenta(payload, token)
      useStore.getState().mostrarExitoRegistro(form.numero_factura.toUpperCase())
      setExito(true)
    } catch (e) {
      setError(e.detail?.mensaje || e.detail || 'Error al registrar la venta.')
    } finally {
      setLoading(false)
    }
  }

  const nuevaVenta = () => {
    setExito(false)
    setForm({ numero_factura: '', jdt_nombre: '', monto_total: '', sagrilaft_diligenciado: false, observaciones: '' })
    setClienteSeleccionado(null)
    setClienteNuevo({ razon_social: '', nit: '', nombre_rep: '', telefono: '' })
    setItems([{ referencia: '', descripcion: '', unidad: 'UND', cantidad: '' }])
    setError('')
  }

  if (exito) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 p-6 text-center bg-gray-50">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="font-mono text-xl font-bold text-gray-900 mb-1">{ultimaFactura}</div>
        <div className="text-sm text-gray-600 mb-1">Venta registrada correctamente</div>
        <div className="text-xs text-gray-500 mb-6">Formato GVM-001 #1 creado automáticamente</div>
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-6 w-full text-left">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Registrado por</div>
          <div className="text-sm font-semibold text-gray-900">{vigilante?.nombre}</div>
          <div className="text-xs text-gray-500">Carnet {vigilante?.carnet} · {vigilante?.empresa}</div>
        </div>
        <button onClick={nuevaVenta}
          className="w-full bg-bdc-brown text-white rounded-xl py-3.5 text-sm font-semibold">
          Registrar otra venta
        </button>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 pb-6">
      <div className="p-4 space-y-4">

        {/* Factura */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Número de factura <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base font-mono font-semibold
                       text-gray-900 outline-none focus:border-bdc-brown uppercase"
            placeholder="Ej: FV-20240314"
            value={form.numero_factura}
            onChange={e => setForm(p => ({ ...p, numero_factura: e.target.value.toUpperCase() }))}
          />
          <div className="text-xs text-gray-400 mt-1">Número en la factura entregada por el JDT/SDT</div>
        </div>

        {/* JDT */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            JDT / SDT que entregó la información <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-base
                       text-gray-900 outline-none focus:border-bdc-brown"
            placeholder="Nombre del jefe o supervisor"
            value={form.jdt_nombre}
            onChange={e => setForm(p => ({ ...p, jdt_nombre: e.target.value }))}
          />
        </div>

        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Cliente <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2 mb-3">
            {['existente','nuevo'].map(m => (
              <button key={m} onClick={() => setModoCliente(m)}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition-colors
                  ${modoCliente===m ? 'bg-bdc-brown text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
                {m === 'existente' ? '🔍 Ya registrado' : '➕ Cliente nuevo'}
              </button>
            ))}
          </div>

          {modoCliente === 'existente' ? (
            clienteSeleccionado ? (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{clienteSeleccionado.razon_social}</div>
                  <div className="text-xs text-gray-500">NIT {clienteSeleccionado.nit}</div>
                </div>
                <button onClick={() => setClienteSeleccionado(null)}
                  className="text-bdc-brown text-xs font-medium">Cambiar</button>
              </div>
            ) : (
              <div>
                <input ref={busqRef}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                             text-gray-900 outline-none focus:border-bdc-brown"
                  placeholder="Buscar por nombre o NIT..."
                  value={busqCliente}
                  onChange={e => buscarClientes(e.target.value)}
                />
                {sugerenciasClientes.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    {sugerenciasClientes.map(c => (
                      <div key={c.id} onClick={() => seleccionarCliente(c)}
                        className="px-4 py-3 border-b border-gray-100 last:border-0 cursor-pointer active:bg-gray-50">
                        <div className="text-sm font-medium text-gray-900">{c.razon_social}</div>
                        <div className="text-xs text-gray-500">NIT {c.nit} · {c.total_compras} compra(s)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="space-y-2">
              {[
                { key:'razon_social', placeholder:'Razón social *', required:true },
                { key:'nit', placeholder:'NIT *', required:true },
                { key:'nombre_rep', placeholder:'Representante (opcional)' },
                { key:'telefono', placeholder:'Teléfono (opcional)' }
              ].map(f => (
                <input key={f.key}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                             text-gray-900 outline-none focus:border-bdc-brown"
                  placeholder={f.placeholder}
                  value={clienteNuevo[f.key]}
                  onChange={e => setClienteNuevo(p => ({ ...p, [f.key]: e.target.value }))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ítems */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Mercancía <span className="text-red-500">*</span>
          </label>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase">
              <div className="col-span-5">Referencia</div>
              <div className="col-span-3 text-center">Cant.</div>
              <div className="col-span-3 text-center">Unidad</div>
              <div className="col-span-1"></div>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1 p-2 border-b border-gray-100 last:border-0 items-center">
                <input className="col-span-5 bg-gray-50 rounded-lg px-2 py-2 text-xs text-gray-900 outline-none border border-gray-200 focus:border-bdc-brown uppercase"
                  placeholder="REF" value={item.referencia}
                  onChange={e => updateItem(idx, 'referencia', e.target.value.toUpperCase())} />
                <input type="number" min="1"
                  className="col-span-3 bg-gray-50 rounded-lg px-2 py-2 text-xs text-center text-gray-900 outline-none border border-gray-200 focus:border-bdc-brown"
                  placeholder="0" value={item.cantidad}
                  onChange={e => updateItem(idx, 'cantidad', e.target.value)} />
                <select className="col-span-3 bg-gray-50 rounded-lg px-1 py-2 text-xs text-gray-900 outline-none border border-gray-200"
                  value={item.unidad} onChange={e => updateItem(idx, 'unidad', e.target.value)}>
                  <option>UND</option><option>R1</option><option>CX</option>
                </select>
                <button onClick={() => quitarItem(idx)} disabled={items.length === 1}
                  className="col-span-1 flex items-center justify-center text-gray-300 disabled:opacity-30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button onClick={agregarItem}
              className="w-full py-2.5 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-bdc-brown border-t border-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar referencia
            </button>
          </div>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Monto total <span className="text-red-500">*</span>
          </label>
          <input type="number" min="0"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg font-semibold
                       text-gray-900 outline-none focus:border-bdc-brown"
            placeholder="0"
            value={form.monto_total}
            onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))}
          />
          {monto > 0 && (
            <div className="flex justify-between mt-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
              <span className="text-xs text-gray-400">Total</span>
              <span className="text-base font-semibold text-bdc-brown">${monto.toLocaleString('es-CO')}</span>
            </div>
          )}
        </div>

        {/* SAGRILAFT */}
        {requiereSagrilaft && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="text-sm font-semibold text-orange-800 mb-1">⚠️ Requiere formato SAGRILAFT</div>
            <div className="text-xs text-orange-700 mb-3">
              Compra ≥ $40.000.000. El JDT/SDT debe diligenciar el formato antes de registrar.
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-bdc-brown"
                checked={form.sagrilaft_diligenciado}
                onChange={e => setForm(p => ({ ...p, sagrilaft_diligenciado: e.target.checked }))} />
              <span className="text-sm font-medium text-orange-900">Confirmo que el formato SAGRILAFT está diligenciado</span>
            </label>
          </div>
        )}

        {/* Observaciones */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            Observaciones
          </label>
          <textarea
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm
                       text-gray-900 outline-none focus:border-bdc-brown resize-none"
            rows={3} placeholder="Notas adicionales..."
            value={form.observaciones}
            onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <button onClick={registrar} disabled={!esValido() || loading}
          className="w-full bg-bdc-brown disabled:bg-gray-300 text-white rounded-xl py-4 text-sm font-semibold
                     flex items-center justify-center gap-2 active:scale-98 transition-transform">
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {loading ? 'Registrando...' : 'Registrar venta'}
        </button>
      </div>
    </div>
  )
}
