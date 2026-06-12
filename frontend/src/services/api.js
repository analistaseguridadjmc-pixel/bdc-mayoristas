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
  logout: (token) => req('POST', '/auth/logout', null, token),

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
