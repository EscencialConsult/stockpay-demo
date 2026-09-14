import { useState } from 'react'
import { MOCK_CATALOG, MOCK_SUCURSALES } from '../../mocks/data.js'

const MOCK_STOCK = MOCK_CATALOG.slice(0, 10).map((p, i) => ({
  producto:        p,
  stockTeorico:    parseFloat((Math.random() * 40 + 5).toFixed(2)),
  stockFisico:     null,
  ultimaActualizacion: '2025-06-12',
  alerta:          i === 2 || i === 7,
}))

function fmt(n) {
  return Number(n).toFixed(3)
}

export default function InventarioPage() {
  const [sucursalSel, setSucursalSel] = useState(MOCK_SUCURSALES[0].id)
  const [stock, setStock]             = useState(MOCK_STOCK)
  const [fase, setFase]               = useState('normal')  // 'normal' | 'conteo' | 'conciliado'
  const [stockEdit, setStockEdit]     = useState({})

  function iniciarConteo() {
    setFase('conteo')
    setStockEdit({})
  }

  function conciliar() {
    setFase('conciliado')
  }

  function resetear() {
    setFase('normal')
    setStockEdit({})
  }

  const sucursal = MOCK_SUCURSALES.find(s => s.id === sucursalSel)

  return (
    <div className="max-w-4xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inventario</h1>
          <p className="text-sm text-gray-400 mt-0.5">Stock teórico vs. conteo físico</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sucursalSel}
            onChange={e => setSucursalSel(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {MOCK_SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          {fase === 'normal' && (
            <button
              onClick={iniciarConteo}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
            >
              Iniciar conteo físico
            </button>
          )}
          {fase === 'conteo' && (
            <>
              <button
                onClick={resetear}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={conciliar}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700"
              >
                Conciliar
              </button>
            </>
          )}
          {fase === 'conciliado' && (
            <button
              onClick={resetear}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50"
            >
              Nueva conciliación
            </button>
          )}
        </div>
      </div>

      {/* Banner de estado */}
      {fase === 'conteo' && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          <strong>Conteo en curso</strong> · Ingresá el stock físico que contaste para cada producto.
          Las ventas continúan normalmente durante el conteo.
        </div>
      )}
      {fase === 'conciliado' && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <strong>Conciliación completada</strong> · Los faltantes y sobrantes han sido registrados.
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Producto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock teórico</th>
              {fase !== 'normal' && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {fase === 'conteo' ? 'Stock físico' : 'Conteo físico'}
                </th>
              )}
              {fase === 'conciliado' && (
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diferencia</th>
              )}
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alerta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stock.map(row => {
              const fisico  = parseFloat(stockEdit[row.producto.id] ?? '') || null
              const diff    = fisico !== null ? fisico - row.stockTeorico : null
              return (
                <tr key={row.producto.id} className={`hover:bg-gray-50 ${row.alerta ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.producto.descripcion}</p>
                    <p className="text-xs text-gray-400">{row.producto.familia}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">
                    {fmt(row.stockTeorico)} {row.producto.unidadMedida}
                  </td>
                  {fase === 'conteo' && (
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="—"
                        value={stockEdit[row.producto.id] ?? ''}
                        onChange={e => setStockEdit(prev => ({ ...prev, [row.producto.id]: e.target.value }))}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
                      />
                    </td>
                  )}
                  {fase === 'conciliado' && (
                    <>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        {fisico !== null ? `${fmt(fisico)} ${row.producto.unidadMedida}` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold ${
                        diff === null ? 'text-gray-300' :
                        diff < 0 ? 'text-red-600' :
                        diff > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {diff === null ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff)}`}
                      </td>
                    </>
                  )}
                  <td className="px-4 py-3 text-center">
                    {row.alerta
                      ? <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Stock negativo" />
                      : <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                    }
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
