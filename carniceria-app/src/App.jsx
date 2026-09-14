import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './core/queryClient.js'
import { AuthProvider } from './core/AuthContext.jsx'
import { BranchProvider } from './core/BranchContext.jsx'
import { ProtectedRoute } from './core/ProtectedRoute.jsx'
import { AdminLayout } from './layouts/AdminLayout.jsx'
import { PosLayout } from './layouts/PosLayout.jsx'

import PosPage            from './features/pos/PosPage.jsx'
import LoginPage          from './features/auth/LoginPage.jsx'
import DashboardPage      from './features/dashboard/DashboardPage.jsx'
import CatalogPage        from './features/catalogo/CatalogPage.jsx'
import InventarioPage     from './features/inventario/InventarioPage.jsx'
import SucursalesPage     from './features/sucursales/SucursalesPage.jsx'
import CuentasPage        from './features/cuentas/CuentasPage.jsx'
import DespieccePage      from './features/despiece/DespieccePage.jsx'
import VentasInternasPage from './features/ventas-internas/VentasInternasPage.jsx'
import CierreCajaPage     from './features/cierre-caja/CierreCajaPage.jsx'
import ReportesPage       from './features/reportes/ReportesPage.jsx'

const NoAutorizado = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <p className="text-lg font-semibold text-gray-900 mb-1">Acceso no autorizado</p>
      <p className="text-sm text-gray-500 mb-4">No tenÃ©s permisos para ver esta secciÃ³n.</p>
      <a href="/login" className="text-sm text-gray-600 underline hover:text-gray-900">Volver al inicio</a>
    </div>
  </div>
)

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BranchProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"         element={<LoginPage />} />
              <Route path="/no-autorizado" element={<NoAutorizado />} />

              {/* â”€â”€ Admin / Subadmin / Socio â”€â”€ */}
              <Route element={<ProtectedRoute allowedRoles={['administrador', 'subadministrador', 'socio']} />}>
                <Route element={<AdminLayout />}>

                  {/* Todos los roles con acceso al panel */}
                  <Route path="/dashboard"  element={<DashboardPage />} />
                  <Route path="/reportes"   element={<ReportesPage />} />

                  {/* Admin + Subadmin */}
                  <Route element={<ProtectedRoute allowedRoles={['administrador', 'subadministrador']} />}>
                    <Route path="/despiece"        element={<DespieccePage />} />
                    <Route path="/ventas-internas" element={<VentasInternasPage />} />
                    <Route path="/cierre-caja"     element={<CierreCajaPage />} />
                    <Route path="/catalogo"        element={<CatalogPage />} />
                    <Route path="/inventario"      element={<InventarioPage />} />
                    <Route path="/sucursales"      element={<SucursalesPage />} />
                    <Route path="/cuentas"         element={<CuentasPage />} />
                  </Route>

                </Route>
              </Route>

              {/* â”€â”€ Cajero â”€â”€ */}
              <Route element={<ProtectedRoute allowedRoles={['cajero']} />}>
                <Route element={<PosLayout />}>
                  <Route path="/pos"             element={<PosPage />} />
                  <Route path="/recepciones"     element={<VentasInternasPage />} />
                  <Route path="/cierre-caja"     element={<CierreCajaPage />} />
                </Route>
              </Route>

              <Route path="/"  element={<Navigate to="/login" replace />} />
              <Route path="*"  element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </BranchProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
