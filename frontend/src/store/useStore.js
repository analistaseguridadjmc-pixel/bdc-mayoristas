import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set) => ({
      // Auth
      token: null,
      sesion: null,
      vigilante: null,
      tienda: null,

      // Navegación
      pantalla: 'login',   // login | app
      tabActiva: 'pendientes', // pendientes | registrar | anomalia
      ventaSeleccionada: null, // objeto venta del detalle
      subPantalla: null,       // null | 'detalle' | 'retiro' | 'retiro-paso2' | 'retiro-paso3' | 'exito-registro'

      // Estado local de formularios (se resetean al cerrar)
      llegadaData: null,

      // Admin
      adminUsuario: null,
      adminPagina: 'dashboard',

      // Acciones Auth
      setAuth: (token, sesion, vigilante, tienda) =>
        set({ token, sesion, vigilante, tienda, pantalla: 'app', tabActiva: 'pendientes' }),
      setAdminAuth: (token, usuario, tienda) =>
        set({ token, adminUsuario: usuario, tienda, pantalla: 'admin' }),
      clearAuth: () =>
        set({ token: null, sesion: null, vigilante: null, tienda: null, adminUsuario: null, pantalla: 'login' }),
      setAdminPagina: (pagina) => set({ adminPagina: pagina }),

      // Navegación
      setTab: (tab) => set({ tabActiva: tab, ventaSeleccionada: null, subPantalla: null }),
      abrirDetalle: (venta) => set({ ventaSeleccionada: venta, subPantalla: 'detalle' }),
      abrirRetiro: (llegadaData) => set({ subPantalla: 'retiro', llegadaData }),
      avanzarRetiro: (paso) => set({ subPantalla: paso }),
      cerrarDetalle: () => set({ ventaSeleccionada: null, subPantalla: null }),
      mostrarExitoRegistro: (factura) => set({ subPantalla: 'exito-registro', ultimaFactura: factura }),
      ultimaFactura: null,
    }),
    {
      name: 'bdc-mayoristas',
      partialize: (s) => ({ token: s.token, sesion: s.sesion, vigilante: s.vigilante, tienda: s.tienda })
    }
  )
)
