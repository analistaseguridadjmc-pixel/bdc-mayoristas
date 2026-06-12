import { useStore } from '../store/useStore'
import { api } from '../services/api'
import TabPendientes from './tabs/TabPendientes'
import TabRegistrar from './tabs/TabRegistrar'
import TabAnomalia from './tabs/TabAnomalia'

const TABS = [
  {
    id: 'pendientes', label: 'Pendientes',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  },
  {
    id: 'registrar', label: 'Registrar',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    )
  },
  {
    id: 'anomalia', label: 'Anomalía',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    )
  }
]

export default function AppShell() {
  const { vigilante, tienda, token, tabActiva, subPantalla, setTab, clearAuth } = useStore(s => s)

  const handleLogout = async () => {
    if (confirm('¿Cerrar turno y salir?')) {
      try { await api.logout(token) } catch {}
      clearAuth()
    }
  }

  const isFullscreen = subPantalla === 'detalle' ||
    subPantalla === 'retiro' || subPantalla === 'retiro-paso2' ||
    subPantalla === 'retiro-paso3' || subPantalla === 'exito-registro'

  return (
    <div className="flex flex-col h-screen max-w-sm mx-auto bg-white">
      {/* Header */}
      {!isFullscreen && (
        <div className="bg-bdc-brown flex-shrink-0">
          <div className="px-4 pt-3 pb-2 flex justify-between items-start">
            <div>
              <div className="text-white font-semibold text-base leading-tight">{vigilante?.nombre}</div>
              <div className="text-amber-200 text-xs mt-0.5">
                Carnet {vigilante?.carnet} · {vigilante?.empresa}
              </div>
              <div className="text-amber-200 text-xs">{tienda?.nombre}</div>
            </div>
            <button onClick={handleLogout}
              className="bg-black/20 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 mt-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Salir
            </button>
          </div>
          {/* Turno */}
          <div className="bg-black/15 px-4 py-1.5 flex justify-between items-center">
            <span className="text-amber-100 text-xs">Turno activo</span>
            <span className="text-amber-100 text-xs font-mono">
              {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )}

      {/* Tabs — ocultas en pantallas fullscreen */}
      {!isFullscreen && (
        <div className="flex bg-white border-b border-gray-200 flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setTab(tab.id)}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-xs font-medium
                transition-colors border-b-2
                ${tabActiva === tab.id
                  ? 'text-bdc-brown border-bdc-brown'
                  : 'text-gray-400 border-transparent'
                }
                ${tab.id === 'anomalia' && tabActiva !== 'anomalia' ? 'text-red-400' : ''}`}>
              <span className={tab.id === 'anomalia' && tabActiva !== 'anomalia' ? 'text-red-400' : ''}>
                {tab.icon}
              </span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tabActiva === 'pendientes' && <TabPendientes />}
        {tabActiva === 'registrar' && <TabRegistrar />}
        {tabActiva === 'anomalia' && <TabAnomalia />}
      </div>
    </div>
  )
}
