import { useState } from 'react'
import { MOCK_CATALOG } from '../../mocks/data.js'

const FAMILIAS = [...new Set(MOCK_CATALOG.map(p => p.familia))]

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
}

export default function CatalogPage() {
  const [productos, setProductos] = useState(MOCK_CATALOG)
  const [busqueda, setBusqueda]   = useState('')
  const [familia, setFamilia]     = useState('')
  const [modal, setModal]         = useState(null)  // null | 'nuevo' | producto

  const filtrados = productos.filter(p => {
    const lq = busqueda.toLowerCase()
    const matchBusqueda = !busqueda || p.descripcion.toLowerCase().includes(lq) || p.plu.includes(lq)
    const matchFamilia  = !familia || p.familia === familia
    return matchBusqueda && matchFamilia
  })

  function toggleActivo(id) {
    setProductos(prev => prev.map(p => p.id === id ? { ...p, activo: !p.activo } : p))
  }

  return (
    <div className="max-w-5xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de productos</h1>
          <p className="text-sm text-gray-400 mt-0.5">{productos.filter(p => p.activo).length} productos activos · {productos.length} total</p>
        </div>
        <button
          onClick={() => setModal('nuevo')}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >
          + Nuevo producto
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Buscar por descripción o PLU..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
        <select
          value={familia}
          onChange={e => setFamilia(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white"
        >
          <option value="">Todas las familias</option>
          {FAMILIAS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">PLU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Familia</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Precio</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Unidad</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.activo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.plu}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{p.descripcion}</p>
                  {p.codigoEan && <p className="text-xs text-gray-400">EAN: {p.codigoEan}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 font-medium">
                    {p.familia}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(p.precio)}</td>
                <td className="px-4 py-3 text-center text-gray-500">{p.unidadMedida}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActivo(p.id)}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      p.activo
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => setModal(p)}
                    className="text-xs text-gray-500 hover:text-gray-900 underline"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtrados.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No hay productos con esos criterios.
          </div>
        )}
      </div>

      {/* Modal visual (sin persistencia real) */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">
                {modal === 'nuevo' ? 'Nuevo producto' : `Editar · ${modal.descripcion}`}
              </h2>
              <button onClick={() => setModal(null)}
                className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">PLU</label>
                  <input
                    defaultValue={modal === 'nuevo' ? '' : modal.plu}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                  <select
                    defaultValue={modal === 'nuevo' ? 'KG' : modal.unidadMedida}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <option value="KG">KG</option>
                    <option value="UN">UN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <input
                  defaultValue={modal === 'nuevo' ? '' : modal.descripcion}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Familia</label>
                  <input
                    defaultValue={modal === 'nuevo' ? '' : modal.familia}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Precio</label>
                  <input
                    type="number"
                    defaultValue={modal === 'nuevo' ? '' : modal.precio}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Código EAN (opcional)</label>
                <input
                  defaultValue={modal === 'nuevo' ? '' : (modal.codigoEan ?? '')}
                  placeholder="7798..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-700"
              >
                {modal === 'nuevo' ? 'Crear producto' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
