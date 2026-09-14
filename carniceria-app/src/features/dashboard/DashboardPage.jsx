import { MOCK_STATS, MOCK_SUCURSALES } from '../../mocks/data.js'
import { useAuth } from '../../core/AuthContext.jsx'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function StatCard({ label, value, sub, color = 'gray', alert = false }) {
  const border = alert ? 'border-red-200' : 'border-gray-200'
  const dot    = alert ? 'bg-red-500' : 'bg-gray-400'
  return (
    <div className={`bg-white rounded-lg border ${border} p-5`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full ${dot} inline-block`} />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const s = MOCK_STATS

  return (
    <div className="max-w-5xl">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Buenos días, {user?.nombre?.split(' ')[0] ?? 'Admin'}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Resumen del día · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard
          label="Ventas hoy"
          value={fmt(s.ventasHoy)}
          sub={`${s.ticketsHoy} tickets · promedio ${fmt(s.ticketPromedio)}`}
        />
        <StatCard
          label="Tickets emitidos"
          value={s.ticketsHoy}
          sub="en todas las sucursales"
        />
        <StatCard
          label="Alertas de stock"
          value={s.alertasStock}
          sub="productos con stock negativo"
          alert={s.alertasStock > 0}
        />
        <StatCard
          label="Pendientes"
          value={s.ventasInternasPendientes + s.productosProvisionales}
          sub={`${s.ventasInternasPendientes} ventas internas · ${s.productosProvisionales} productos`}
          alert={s.productosProvisionales > 0}
        />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Ranking de productos */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Top productos del día</h2>
          <div className="space-y-3">
            {s.rankingHoy.map((p, i) => {
              const pct = Math.round((p.totalFacturado / s.ventasHoy) * 100)
              return (
                <div key={p.descripcion}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">
                      <span className="text-gray-400 mr-2 font-mono text-xs">{i + 1}</span>
                      {p.descripcion}
                    </span>
                    <span className="font-semibold text-gray-900">{fmt(p.totalFacturado)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ventas por sucursal */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Ventas por sucursal</h2>
          <div className="space-y-4">
            {s.ventasPorSucursal.map(suc => {
              const pct = Math.round((suc.total / s.ventasHoy) * 100)
              return (
                <div key={suc.nombre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{suc.nombre}</span>
                    <span className="font-semibold text-gray-900">{fmt(suc.total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-800 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{pct}% del total</p>
                </div>
              )
            })}
          </div>

          {/* Sucursales activas */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sucursales activas</p>
            <div className="flex flex-wrap gap-2">
              {MOCK_SUCURSALES.map(suc => (
                <span key={suc.id}
                  className="px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                  {suc.nombre}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Accesos rápidos */}
      <div className="mt-4 bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Acciones rápidas</h2>
        <div className="flex gap-3">
          <a href="/catalogo"
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors">
            Ver catálogo
          </a>
          <a href="/inventario"
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            Ver inventario
          </a>
          <a href="/cuentas"
            className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
            Cuentas corrientes
          </a>
        </div>
      </div>
    </div>
  )
}
