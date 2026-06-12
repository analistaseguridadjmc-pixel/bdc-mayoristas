const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw { status: res.status, detail: data.detail || data }
  return data
}

export const api = {
  // Auth
  login: (payload) => req('POST', '/auth/login', payload),
  adminLogin: (payload) => req('POST', '/auth/admin-login', payload),
  logout: (token) => req('POST', '/auth/logout', null, token),

  // Admin
  adminDashboard: (token) => req('GET', '/admin/dashboard', null, token),
  adminUsuarios: (token) => req('GET', '/admin/usuarios', null, token),
  adminTiendas: (token) => req('GET', '/admin/tiendas', null, token),
  adminCrearUsuario: (payload, token) => req('POST', '/admin/usuarios', payload, token),
  adminToggleUsuario: (id, token) => req('PATCH', `/admin/usuarios/${id}/estado`, null, token),
  adminExportarVentas: async (mes, token) => {
    const res = await fetch(`${BASE}/admin/exportar/ventas?mes=${mes}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw await res.json()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `ventas_${mes}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  },
  adminExportarRetiros: async (mes, token) => {
    const res = await fetch(`${BASE}/admin/exportar/retiros?mes=${mes}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw await res.json()
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `retiros_${mes}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  },

  // Ventas
  ventasActivas: (token) => req('GET', '/vigilante/ventas-activas', null, token),
  buscarFactura: (q, token) => req('GET', `/vigilante/buscar?q=${encodeURIComponent(q)}`, null, token),
  detalleVenta: (factura, token) => req('GET', `/vigilante/factura/${encodeURIComponent(factura)}`, null, token),
  registrarVenta: (payload, token) => req('POST', '/vigilante/ventas/registrar', payload, token),

  // Retiros
  confirmarLlegada: (factura, payload, token) =>
    req('POST', `/vigilante/factura/${encodeURIComponent(factura)}/confirmar-llegada`, payload, token),
  confirmarEntrega: (factura, payload, token) =>
    req('POST', `/vigilante/factura/${encodeURIComponent(factura)}/confirmar-entrega`, payload, token),
  formatoAdicional: (factura, token) =>
    req('POST', `/vigilante/factura/${encodeURIComponent(factura)}/formato-adicional`, null, token),

  // Clientes
  buscarClientes: (q, token) => req('GET', `/vigilante/clientes/buscar?q=${encodeURIComponent(q)}`, null, token),

  // Anomalía
  reportarAnomalia: (payload, token) => req('POST', '/vigilante/reportar-anomalia', payload, token),
}
