import { useEffect, useState } from 'react'
import { api } from '../../../services/api'
import { useStore } from '../../../store/useStore'

const ROL_LABEL = { vigilante:'Vigilante', jdt:'JDT', sdt:'SDT', jvo:'JVO', auditor:'Auditor' }
const ROL_COLOR = {
  vigilante: 'bg-blue-100 text-blue-700',
  jdt:       'bg-purple-100 text-purple-700',
  sdt:       'bg-indigo-100 text-indigo-700',
  jvo:       'bg-teal-100 text-teal-700',
  auditor:   'bg-gray-100 text-gray-700',
}

export default function Usuarios() {
  const token = useStore(s => s.token)
  const [usuarios, setUsuarios] = useState([])
  const [tiendas, setTiendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [filtrRol, setFiltroRol] = useState('')
  const [form, setForm] = useState({ nombre:'', documento:'', password:'', rol:'vigilante', tienda_codigo:'', empresa_seguridad:'', numero_carnet:'', turno:'diurno' })
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  const [confirmandoId, setConfirmandoId] = useState(null)

  const cargar = async () => {
    setLoading(true)
    try {
      const [u, t] = await Promise.all([api.adminUsuarios(token), api.adminTiendas(token)])
      setUsuarios(u); setTiendas(t)
    } finally { setLoading(false) }
  }

  useEffect(() => { cargar() }, [])

  const toggleEstado = async (id) => {
    await api.adminToggleUsuario(id, token)
    setConfirmandoId(null)
    cargar()
  }

  const guardar = async () => {
    if (!form.nombre || !form.documento || !form.password || !form.tienda_codigo) {
      setErrorModal('Complete los campos obligatorios.'); return
    }
    if (form.rol === 'vigilante' && (!form.empresa_seguridad || !form.numero_carnet)) {
      setErrorModal('Para vigilantes se requiere empresa y carnet.'); return
    }
    setGuardando(true); setErrorModal('')
    try {
      await api.adminCrearUsuario(form, token)
      setModalAbierto(false)
      setForm({ nombre:'', documento:'', password:'', rol:'vigilante', tienda_codigo:'', empresa_seguridad:'', numero_carnet:'', turno:'diurno' })
      cargar()
    } catch (e) {
      setErrorModal(e.detail?.mensaje || 'Error al crear el usuario.')
    } finally { setGuardando(false) }
  }

  const filtrados = usuarios.filter(u => {
    const q = filtro.toLowerCase()
    const matchQ = !q || u.nombre.toLowerCase().includes(q) || u.documento.includes(q)
    const matchRol = !filtrRol || u.rol === filtrRol
    return matchQ && matchRol
  })

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 bg-bdc-brown text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-bdc-dark transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        <input
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown flex-1 max-w-xs"
          placeholder="Buscar por nombre o documento..."
          value={filtro} onChange={e => setFiltro(e.target.value)}
        />
        <select
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
          value={filtrRol} onChange={e => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {Object.entries(ROL_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-400">Cargando usuarios...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  {['Nombre','Documento','Rol','Tienda','Carnet','Empresa','Estado','Acción'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-xs">{u.documento}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${ROL_COLOR[u.rol]}`}>
                        {ROL_LABEL[u.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.tienda_codigo} · {u.tienda_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{u.numero_carnet || '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.empresa_seguridad || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-lg font-medium ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {confirmandoId === u.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-red-600 font-medium">¿Confirmar?</span>
                          <button onClick={() => toggleEstado(u.id)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                            Sí
                          </button>
                          <button onClick={() => setConfirmandoId(null)}
                            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => u.activo ? setConfirmandoId(u.id) : toggleEstado(u.id)}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            u.activo
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-green-200 text-green-600 hover:bg-green-50'
                          }`}>
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtrados.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear usuario */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Nuevo usuario</h3>
              <button onClick={() => { setModalAbierto(false); setErrorModal('') }}
                className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key:'nombre', label:'Nombre completo *', placeholder:'Juan Pérez' },
                  { key:'documento', label:'Documento *', placeholder:'1020456789' },
                  { key:'password', label:'Contraseña *', placeholder:'••••••••', type:'password' },
                ].map(f => (
                  <div key={f.key} className={f.key === 'nombre' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{f.label}</label>
                    <input type={f.type || 'text'}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Rol *</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                    value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                    {Object.entries(ROL_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Tienda *</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                    value={form.tienda_codigo} onChange={e => setForm(p => ({ ...p, tienda_codigo: e.target.value }))}>
                    <option value="">Seleccionar...</option>
                    {tiendas.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} · {t.nombre}</option>)}
                  </select>
                </div>
              </div>

              {form.rol === 'vigilante' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Datos de vigilante</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Empresa seguridad *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                        placeholder="Prosegur S.A." value={form.empresa_seguridad}
                        onChange={e => setForm(p => ({ ...p, empresa_seguridad: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Número de carnet *</label>
                      <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                        placeholder="VIG-0001" value={form.numero_carnet}
                        onChange={e => setForm(p => ({ ...p, numero_carnet: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Turno</label>
                      <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-bdc-brown"
                        value={form.turno} onChange={e => setForm(p => ({ ...p, turno: e.target.value }))}>
                        <option value="diurno">Diurno</option>
                        <option value="nocturno">Nocturno</option>
                        <option value="mixto">Mixto</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {errorModal && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{errorModal}</div>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button onClick={() => { setModalAbierto(false); setErrorModal('') }}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="px-5 py-2 text-sm font-semibold bg-bdc-brown text-white rounded-xl hover:bg-bdc-dark disabled:opacity-60 transition-colors">
                {guardando ? 'Guardando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
