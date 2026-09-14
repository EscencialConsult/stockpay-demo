import { useState } from 'react'
import { MOCK_CIERRE_HOY, MOCK_SUCURSALES } from '../../mocks/data.js'
import { useAuth } from '../../core/AuthContext.jsx'
import { useBranch } from '../../core/BranchContext.jsx'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function CierreCajaPage() {
  const { user }          = useAuth()
  const { sucursal_id }   = useBranch()

  const sucursal = MOCK_SUCURSALES.find(s => s.id === (sucursal_id ?? MOCK_SUCURSALES[0].id))

  const [estado, setEstado]   = useState('abierto')  // 'abierto' | 'cerrado'
  const [gastos, setGastos]   = useState(MOCK_CIERRE_HOY.gastos)
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto]       = useState('')

  // Montos declarados por el cajero para cada medio
  const [declarados, setDeclarados] = useState(() =>
    Object.fromEntries(MOCK_CIERRE_HOY.ventasPorMedio.map(m => [m.medio, '']))
  )

  const totalVentas = MOCK_CIERRE_HOY.ventasBruto
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)
  const neto        = totalVentas - totalGastos

  function addGasto() {
    const m = parseFloat(monto)
    if (!concepto.trim() || !m || m <= 0) return
    setGastos(prev => [...prev, { id: `g-${Date.now()}`, concepto: concepto.trim(), monto: m, usuario: user?.nombre ?? 'Sistema' }])
    setConcepto('')
    setMonto('')
  }

  function cerrarCaja() {
    setEstado('cerrado')
  }

  const efectivoSistema   = MOCK_CIERRE_HOY.ventasPorMedio.find(m => m.medio === 'efectivo')?.monto ?? 0
  const efectivoDeclarado = parseFloat(declarados['efectivo']) || 0
  const diferencia        = efectivoDeclarado - (efectivoSistema - totalGastos)

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cierre de caja</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {sucursal?.nombre ?? 'Sucursal'} · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
          estado === 'cerrado'
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
        }`}>
          {estado === 'cerrado' ? '✓ Caja cerrada' : 'Caja abierta'}
        </span>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1fr' }}>

        {/* Ventas por medio de pago */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Ventas por medio de pago</h2>
            <p className="text-xs text-gray-400 mt-0.5">Registrado por el sistema</p>
          </div>
          <div className="divide-y divide-gray-50">
            {MOCK_CIERRE_HOY.ventasPorMedio.map(m => (
              <div key={m.medio} className="px-5 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-700">{m.label}</span>
                <span className={`text-sm font-semibold font-mono ${m.monto > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                  {m.monto > 0 ? fmt(m.monto) : '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 bg-gray-50 border-t-2 border-gray-200 flex justify-between">
            <span className="text-sm font-semibold text-gray-700">Total facturado</span>
            <span className="text-base font-bold text-gray-900 font-mono">{fmt(totalVentas)}</span>
          </div>
        </div>

        {/* Gastos y neto */}
        <div className="space-y-4">

          {/* Gastos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Gastos y salidas de caja</h2>
            </div>
            {gastos.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {gastos.map(g => (
                  <div key={g.id} className="px-5 py-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-700">{g.concepto}</p>
                      <p className="text-xs text-gray-400">{g.usuario}</p>
                    </div>
                    <span className="text-sm font-semibold text-red-600 font-mono">- {fmt(g.monto)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-4 text-sm text-gray-400">Sin gastos registrados.</p>
            )}

            {estado === 'abierto' && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <input type="text" placeholder="Concepto"
                    value={concepto} onChange={e => setConcepto(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  <input type="number" placeholder="$ Monto" min="0"
                    value={monto} onChange={e => setMonto(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGasto()}
                    className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  <button onClick={addGasto}
                    className="px-3 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700">
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Resumen neto */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumen del día</h2>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total ventas</span>
              <span className="font-mono text-gray-700">{fmt(totalVentas)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total gastos</span>
              <span className="font-mono text-red-500">- {fmt(totalGastos)}</span>
            </div>
            <div className="border-t border-gray-200 pt-3 flex justify-between font-bold">
              <span className="text-gray-800">Neto a rendir</span>
              <span className="text-gray-900 font-mono text-lg">{fmt(neto)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Arqueo de efectivo */}
      <div className="mt-5 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Arqueo de efectivo</h2>
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <p className="text-xs text-gray-500 mb-1">Efectivo en ventas (sistema)</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{fmt(efectivoSistema)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Menos gastos en efectivo</p>
            <p className="text-lg font-bold text-red-500 font-mono">- {fmt(totalGastos)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Efectivo esperado en caja</p>
            <p className="text-lg font-bold text-gray-900 font-mono">{fmt(efectivoSistema - totalGastos)}</p>
          </div>
        </div>

        {estado === 'abierto' && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Efectivo contado físicamente ($)
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number" min="0" step="0.01"
                value={declarados['efectivo']}
                onChange={e => setDeclarados(prev => ({ ...prev, efectivo: e.target.value }))}
                placeholder="Ingresá el monto que contaste"
                className="w-64 border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              {declarados['efectivo'] && (
                <div className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  Math.abs(diferencia) <= 100
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {diferencia > 0 ? '+' : ''}{fmt(diferencia)}{' '}
                  {Math.abs(diferencia) <= 100 ? '✓ Cuadra' : '⚠ Diferencia'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón cerrar */}
      {estado === 'abierto' && (
        <div className="mt-5 flex justify-end gap-3">
          <p className="text-xs text-gray-400 self-center">
            Una vez cerrada, no se podrán agregar ventas a este día.
          </p>
          <button
            onClick={cerrarCaja}
            className="px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cerrar caja del día
          </button>
        </div>
      )}

      {estado === 'cerrado' && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-800 font-semibold text-sm">Caja cerrada correctamente.</p>
          <p className="text-green-600 text-xs mt-1">
            Resumen guardado · {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}
    </div>
  )
}
