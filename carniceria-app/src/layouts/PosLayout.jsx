import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../core/AuthContext.jsx'

export function PosLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="flex flex-col h-screen bg-white font-titulo">
      <header className="bg-white border-b border-gray-200 px-5 py-2.5 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-4">
          <img src="/one-icononegro.webp" alt="" className="h-5 w-5 opacity-70" />
          <nav className="flex gap-1">
            <NavLink to="/pos"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }>
              Caja
            </NavLink>
            <NavLink to="/recepciones"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }>
              Recepciones
            </NavLink>
            <NavLink to="/cierre-caja"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }>
              Cierre de caja
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.nombre}</span>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
            Salir
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto bg-white">
        <Outlet />
      </main>
    </div>
  )
}
