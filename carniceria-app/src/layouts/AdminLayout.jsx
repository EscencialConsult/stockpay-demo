import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../core/AuthContext.jsx'

const NAV = [
  {
    grupo: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', roles: ['administrador', 'subadministrador', 'socio'] },
      { to: '/reportes',  label: 'Reportes',  roles: ['administrador', 'subadministrador', 'socio'] },
    ],
  },
  {
    grupo: 'Operaciones',
    items: [
      { to: '/despiece',        label: 'Despiece',          roles: ['administrador', 'subadministrador'] },
      { to: '/ventas-internas', label: 'Ventas internas',   roles: ['administrador', 'subadministrador'] },
      { to: '/cierre-caja',     label: 'Cierre de caja',    roles: ['administrador', 'subadministrador'] },
      { to: '/inventario',      label: 'Inventario',        roles: ['administrador', 'subadministrador'] },
    ],
  },
  {
    grupo: 'Gestión',
    items: [
      { to: '/catalogo',   label: 'Catálogo',           roles: ['administrador', 'subadministrador'] },
      { to: '/cuentas',    label: 'Cuentas corrientes', roles: ['administrador', 'subadministrador'] },
      { to: '/sucursales', label: 'Sucursales',         roles: ['administrador', 'subadministrador'] },
    ],
  },
]

function Icon({ name }) {
  const paths = {
    dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    reportes:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    despiece:    'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
    ventas:      'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    cierre:      'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    inventario:  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    catalogo:    'M4 6h16M4 10h16M4 14h16M4 18h16',
    cuentas:     'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    sucursales:  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    logout:      'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  }
  const iconKey = {
    '/dashboard':        'dashboard',
    '/reportes':         'reportes',
    '/despiece':         'despiece',
    '/ventas-internas':  'ventas',
    '/cierre-caja':      'cierre',
    '/inventario':       'inventario',
    '/catalogo':         'catalogo',
    '/cuentas':          'cuentas',
    '/sucursales':       'sucursales',
  }[name] ?? 'dashboard'

  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={paths[iconKey]} />
    </svg>
  )
}

export function AdminLayout() {
  const { user, logout } = useAuth()
  const rol = user?.rol ?? ''

  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">

        {/* Logo + usuario */}
        <div className="px-4 py-4 border-b border-gray-100">
          <img src="/one-logonegro.webp" alt="ONE" className="h-6 w-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 truncate">{user?.nombre}</p>
          <span className="text-xs text-gray-400 capitalize">{user?.rol?.replace('administrador', 'Admin').replace('subadministrador', 'Sub-admin')}</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
          {NAV.map((seccion, si) => {
            const visibles = seccion.items.filter(item => item.roles.includes(rol))
            if (!visibles.length) return null
            return (
              <div key={si}>
                {seccion.grupo && (
                  <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {seccion.grupo}
                  </p>
                )}
                <div className="space-y-0.5">
                  {visibles.map(item => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-gray-900 text-white font-medium'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`
                      }
                    >
                      <Icon name={item.to} />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto bg-gray-50 p-6 font-titulo">
        <Outlet />
      </main>
    </div>
  )
}
