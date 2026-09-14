import { useState } from 'react'
import { MOCK_REPORTES, MOCK_STATS } from '../../mocks/data.js'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function fmtPct(n) {
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`
}

export default function ReportesPage() {
  const [periodo, setPeriodo] = useState('Hoy')

  const { porSucursal } = MOCK_REPORTES
  const totalVentasPublico   = porSucursal.reduce((a, s) => a + s.ventasPublico, 0)
  const totalVentasInternas  = porSucursal.reduce((a, s) => a + s.ventasInternas, 0)
  const totalRentabilidad    = porSucursal.reduce((a, s) => a + s.rentabilidad, 0)
  const maxAbsRenta          = Math.max(...porSucursal.map(s => Math.abs(s.rentabilidad)))

  return (
    <div className="max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Rentabilidad real por sucursal, depurada de ventas internas
          </p>
        </div>
        {/* Selector de período */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {MOCK_REPORTES.periodos.map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                periodo === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <KpiCard
          label="Total facturado al público"
          value={fmt(totalVentasPublico)}
          sub={`${MOCK_STATS.ticketsHoy} tickets · ${periodo.toLowerCase()}`}
        />
        <KpiCard
          label="Ventas internas (entre sucursales)"
          value={fmt(totalVentasInternas)}
          sub="a precio interno con 10% de descuento"
          color="blue"
        />
        <KpiCard
          label="Resultado neto consolidado"
          value={fmt(totalRentabilidad)}
          sub="ventas público + margen ventas internas"
          color={totalRentabilidad >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Rentabilidad por sucursal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Rentabilidad por sucursal</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Central vende al resto → su margen incluye el 10% de cada venta interna. Las demás sucursales restan lo que compraron.
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {porSucursal.map(s => {
            const pctBar    = (Math.abs(s.rentabilidad) / maxAbsRenta) * 100
            const positivo  = s.rentabilidad >= 0
            const margenPct = s.ventasPublico > 0 ? (s.rentabilidad / (s.ventasPublico + s.ventasInternas)) * 100 : null
            return (
              <div key={s.nombre} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">{s.nombre}</p>
                  <div className="text-right">
                    <span className={`text-base font-bold font-mono ${positivo ? 'text-green-700' : 'text-red-600'}`}>
                      {fmt(s.rentabilidad)}
                    </span>
                    {margenPct !== null && (
                      <span className={`ml-2 text-xs font-medium ${positivo ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtPct(margenPct)}
                      </span>
                    )}
                  </div>
                </div>
                {/* Barra */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${positivo ? 'bg-green-500' : 'bg-red-400'}`}
                    style={{ width: `${pctBar}%` }}
                  />
                </div>
                {/* Desglose */}
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                  <span>Ventas público: <strong className="text-gray-600">{fmt(s.ventasPublico)}</strong></span>
                  {s.ventasInternas > 0 && (
                    <span>Ventas internas: <strong className="text-gray-600">{fmt(s.ventasInternas)}</strong></span>
                  )}
                  {s.costoInterno > 0 && (
                    <span>Compras internas: <strong className="text-gray-600">- {fmt(s.costoInterno)}</strong></span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ranking de productos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Top 5 productos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Familia</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Facturado</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Participación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {MOCK_STATS.rankingHoy.map((p, i) => {
              const pct = ((p.totalFacturado / totalVentasPublico) * 100).toFixed(1)
              return (
                <tr key={p.descripcion} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{p.descripcion}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                      {p.familia}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 font-mono">
                    {fmt(p.totalFacturado)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gray-800 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'gray' }) {
  const colors = {
    gray:  { dot: 'bg-gray-400',  border: 'border-gray-200' },
    green: { dot: 'bg-green-500', border: 'border-green-200' },
    red:   { dot: 'bg-red-500',   border: 'border-red-200' },
    blue:  { dot: 'bg-blue-400',  border: 'border-blue-200' },
  }
  const c = colors[color] ?? colors.gray
  return (
    <div className={`bg-white rounded-xl border ${c.border} shadow-sm p-5`}>
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} inline-block flex-shrink-0`} />
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}
