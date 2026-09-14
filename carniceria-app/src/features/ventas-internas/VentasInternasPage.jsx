import { useState } from 'react'
import { MOCK_VENTAS_INTERNAS, MOCK_SUCURSALES, MOCK_CATALOG } from '../../mocks/data.js'
import { useAuth } from '../../core/AuthContext.jsx'

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

const ESTADO_BADGE = {
  pendiente:  { label: 'Pendiente de confirmación', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  confirmada: { label: 'Confirmada',                cls: 'bg-green-50 text-green-700 border border-green-200' },
  rechazada:  { label: 'Rechazada',                 cls: 'bg-red-50 text-red-700 border border-red-200' },
}

const PRODUCTOS_KG = MOCK_CATALOG.filter(p => p.unidadMedida === 'KG' && (p.familia === 'Vacuno' || p.familia === 'Cerdo' || p.familia === 'Pollo' || p.familia === 'Embutidos'))

export default function VentasInternasPage() {
  const { user } = useAuth()
  const esCajero = user?.rol === 'cajero'

  const [ventas, setVentas]       = useState(MOCK_VENTAS_INTERNAS)
  const [tab, setTab]             = useState(esCajero ? 'pendientes' : 'historial')
  const [modalConfirm, setModalConfirm] = useState(null)  // venta a confirmar/rechazar
  const [modalNueva, setModalNueva]     = useState(false)

  // Formulario nueva venta
  const [origenId, setOrigenId]   = useState(MOCK_SUCURSALES[0].id)
  const [destinoId, setDestinoId] = useState(MOCK_SUCURSALES[1].id)
  const [items, setItems]         = useState([{ productoId: '', kg: '' }])
  const DESCUENTO = 10

  const pendientes   = ventas.filter(v => v.estado === 'pendiente')
  const misEntradas  = esCajero
    ? pendientes.filter(v => v.destino.id === user?.sucursalId)
    : pendientes

  function confirmarVenta(id, accion) {
    setVentas(prev => prev.map(v =>
      v.id === id ? { ...v, estado: accion === 'confirmar' ? 'confirmada' : 'rechazada' } : v
    ))
    setModalConfirm(null)
  }

  function addItem() {
    setItems(prev => [...prev, { productoId: '', kg: '' }])
  }
  function removeItem(idx) {
    setItems(prev => prev.filter((_, i) => i !== idx))
  }
  function updateItem(idx, field, val) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it))
  }

  function crearVenta() {
    const validItems = items.filter(it => it.productoId && parseFloat(it.kg) > 0)
    if (!validItems.length || origenId === destinoId) return

    const origen  = MOCK_SUCURSALES.find(s => s.id === origenId)
    const destino = MOCK_SUCURSALES.find(s => s.id === destinoId)

    const itemsConPrecio = validItems.map(it => {
      const prod = MOCK_CATALOG.find(p => p.id === it.productoId)
      const precioPublico  = prod?.precio ?? 0
      const precioInterno  = Math.round(precioPublico * (1 - DESCUENTO / 100))
      return {
        productoId:     it.productoId,
        descripcion:    prod?.descripcion ?? it.productoId,
        kg:             parseFloat(it.kg),
        precioPublico,
        precioInterno,
      }
    })

    const totalPublico  = itemsConPrecio.reduce((a, it) => a + it.precioPublico * it.kg, 0)
    const totalInterno  = itemsConPrecio.reduce((a, it) => a + it.precioInterno * it.kg, 0)

    const nueva = {
      id:            `vi-${Date.now()}`,
      origen:        { id: origenId,  nombre: origen?.nombre  ?? origenId },
      destino:       { id: destinoId, nombre: destino?.nombre ?? destinoId },
      estado:        'pendiente',
      fecha:         new Date().toISOString().slice(0, 10),
      usuario:       user?.nombre ?? 'Usuario',
      items:         itemsConPrecio,
      totalPublico,
      totalInterno,
      descuento:     DESCUENTO,
    }

    setVentas(prev => [nueva, ...prev])
    setItems([{ productoId: '', kg: '' }])
    setModalNueva(false)
  }

  const tabs = esCajero
    ? [{ key: 'pendientes', label: `Ingresos pendientes${misEntradas.length ? ` (${misEntradas.length})` : ''}` }]
    : [
        { key: 'pendientes', label: `Pendientes${pendientes.length ? ` (${pendientes.length})` : ''}` },
        { key: 'historial',  label: 'Historial' },
      ]

  const tabData = tab === 'pendientes' ? (esCajero ? misEntradas : pendientes) : ventas

  return (
    <div className="max-w-5xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ventas internas</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Movimientos entre sucursales · 10% de descuento sobre precio público
          </p>
        </div>
        {!esCajero && (
          <button
            onClick={() => setModalNueva(true)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Registrar envío
          </button>
        )}
      </div>

      {/* Alerta cajero */}
      {esCajero && misEntradas.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>{misEntradas.length} envío{misEntradas.length > 1 ? 's' : ''} pendiente{misEntradas.length > 1 ? 's' : ''} de confirmación</strong> para tu sucursal.
          Verificá el peso y los cortes antes de confirmar — la confirmación es deslinde de responsabilidad.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {tabData.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <p className="text-sm">No hay ventas internas para mostrar.</p>
          </div>
        )}

        {tabData.map(v => {
          const badge = ESTADO_BADGE[v.estado] ?? ESTADO_BADGE.pendiente
          return (
            <div key={v.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 text-sm">
                      {v.origen.nombre}
                    </span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-semibold text-gray-900 text-sm">
                      {v.destino.nombre}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {v.fecha} · {v.usuario}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-xs text-gray-400">Total interno ({v.descuento}% off)</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(v.totalInterno)}</p>
                  <p className="text-xs text-gray-400 line-through">{fmt(v.totalPublico)} público</p>
                </div>
              </div>

              {/* Items */}
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="grid gap-1.5">
                  {v.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-700">{it.descripcion}</span>
                      <div className="flex gap-4 text-right text-gray-500 text-xs">
                        <span className="font-mono">{it.kg.toFixed(3)} kg</span>
                        <span className="w-24">{fmt(it.precioInterno)}/kg</span>
                        <span className="font-semibold text-gray-900 w-24">{fmt(it.kg * it.precioInterno)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acciones */}
              {v.estado === 'pendiente' && (
                <div className="mt-4 flex gap-2 justify-end">
                  <button
                    onClick={() => setModalConfirm({ ...v, accion: 'rechazar' })}
                    className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Rechazar recepción
                  </button>
                  <button
                    onClick={() => setModalConfirm({ ...v, accion: 'confirmar' })}
                    className="px-4 py-2 text-sm bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Confirmar recepción
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal confirmación */}
      {modalConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              {modalConfirm.accion === 'confirmar' ? 'Confirmar recepción' : 'Rechazar recepción'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {modalConfirm.accion === 'confirmar'
                ? 'Al confirmar, el stock se actualizará en ambas sucursales y la operación quedará cerrada.'
                : 'Al rechazar, la venta interna quedará anulada y el stock no se moverá.'
              }
              {' '}
              <strong>Esta acción es el deslinde de responsabilidad sobre la mercadería.</strong>
            </p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm mb-4 space-y-1">
              {modalConfirm.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-700">{it.descripcion}</span>
                  <span className="font-mono text-gray-600">{it.kg.toFixed(3)} kg</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setModalConfirm(null)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => confirmarVenta(modalConfirm.id, modalConfirm.accion)}
                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors ${
                  modalConfirm.accion === 'confirmar'
                    ? 'bg-gray-900 hover:bg-gray-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {modalConfirm.accion === 'confirmar' ? 'Sí, confirmar' : 'Sí, rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva venta interna */}
      {modalNueva && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Registrar envío</h2>
              <button onClick={() => setModalNueva(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>

            <div className="space-y-4">
              {/* Origen / Destino */}
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Origen</label>
                  <select value={origenId} onChange={e => setOrigenId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
                    {MOCK_SUCURSALES.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Destino</label>
                  <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
                    {MOCK_SUCURSALES.filter(s => s.id !== origenId).map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Productos a enviar (precio con {DESCUENTO}% de descuento)
                </label>
                <div className="space-y-2">
                  {items.map((it, idx) => {
                    const prod         = MOCK_CATALOG.find(p => p.id === it.productoId)
                    const precioPublico = prod?.precio ?? 0
                    const precioInterno = Math.round(precioPublico * (1 - DESCUENTO / 100))
                    const subtotal      = precioInterno * parseFloat(it.kg || 0)
                    return (
                      <div key={idx} className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr 80px auto' }}>
                        <select value={it.productoId} onChange={e => updateItem(idx, 'productoId', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400">
                          <option value="">— Producto —</option>
                          {PRODUCTOS_KG.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.descripcion} · {fmt(Math.round(p.precio * (1 - DESCUENTO / 100)))}/kg
                            </option>
                          ))}
                        </select>
                        <input type="number" step="0.1" min="0" placeholder="Kg"
                          value={it.kg} onChange={e => updateItem(idx, 'kg', e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-gray-400" />
                        <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                          className="text-gray-400 hover:text-red-500 disabled:opacity-30 text-lg font-bold w-6">
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
                <button onClick={addItem}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-900 underline">
                  + Agregar producto
                </button>
              </div>

              {/* Resumen */}
              {items.some(it => it.productoId && parseFloat(it.kg) > 0) && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1 border border-gray-200">
                  {items.filter(it => it.productoId && parseFloat(it.kg) > 0).map((it, i) => {
                    const prod = MOCK_CATALOG.find(p => p.id === it.productoId)
                    const pi   = Math.round((prod?.precio ?? 0) * (1 - DESCUENTO / 100))
                    return (
                      <div key={i} className="flex justify-between">
                        <span className="text-gray-600">{prod?.descripcion}</span>
                        <span className="font-semibold text-gray-900">{fmt(pi * parseFloat(it.kg))}</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-gray-200 pt-1 flex justify-between font-bold">
                    <span>Total con {DESCUENTO}% off</span>
                    <span>{fmt(items.filter(it => it.productoId && parseFloat(it.kg) > 0).reduce((a, it) => {
                      const prod = MOCK_CATALOG.find(p => p.id === it.productoId)
                      return a + Math.round((prod?.precio ?? 0) * (1 - DESCUENTO / 100)) * parseFloat(it.kg)
                    }, 0))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalNueva(false)}
                className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={crearVenta}
                disabled={!items.some(it => it.productoId && parseFloat(it.kg) > 0) || origenId === destinoId}
                className="px-4 py-2 text-sm bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                Registrar envío
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
