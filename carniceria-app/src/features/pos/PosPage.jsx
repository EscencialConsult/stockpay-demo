import { useReducer, useState, useCallback, useRef, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../core/AuthContext.jsx'
import { useBranch } from '../../core/BranchContext.jsx'
import { useBarcodeScanner } from './hooks/useBarcodeScanner.js'
import { parseBarcode, resolveScaleBarcode } from '../../utils/BarcodeParser.js'
import { MOCK_CATALOG, MOCK_CLIENTES } from '../../mocks/data.js'

// Sin backend aún: catálogo y clientes desde datos demo
const DEMO_MODE = true

// ── API helpers ──────────────────────────────────────────────────────────────

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function fetchCatalog(sucursalId, token) {
  if (DEMO_MODE) return MOCK_CATALOG
  try {
    const res = await fetch(`/api/catalog?sucursalId=${sucursalId}`, { headers: authHeaders(token) })
    if (!res.ok) return MOCK_CATALOG
    return res.json()
  } catch {
    return MOCK_CATALOG
  }
}

async function searchClientes(q, token) {
  if (q.trim().length < 2) return []
  if (DEMO_MODE) {
    const lq = q.toLowerCase()
    return MOCK_CLIENTES.filter(c =>
      c.nombre.toLowerCase().includes(lq) || c.documento.includes(lq)
    )
  }
  try {
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`, { headers: authHeaders(token) })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

// ── Carrito: reducer ─────────────────────────────────────────────────────────

const MEDIOS = [
  { key: 'efectivo',          label: 'Efectivo' },
  { key: 'tarjeta_debito',    label: 'Débito' },
  { key: 'tarjeta_credito',   label: 'Crédito' },
  { key: 'qr',                label: 'QR' },
  { key: 'transferencia',     label: 'Transferencia' },
  { key: 'billetera_virtual', label: 'Billetera Virtual' },
  { key: 'cuenta_corriente',  label: 'Cta. Corriente' },
]

function carritoReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const idx = state.findIndex(i => i.productoId === action.item.productoId && !action.item.esBalanza)
      if (idx >= 0 && !action.item.esBalanza) {
        const updated = [...state]
        updated[idx] = {
          ...updated[idx],
          cantidad: updated[idx].cantidad + action.item.cantidad,
          subtotal: (updated[idx].cantidad + action.item.cantidad) * updated[idx].precioUnitario,
        }
        return updated
      }
      return [...state, { ...action.item, lineId: `${action.item.productoId}-${Date.now()}` }]
    }
    case 'REMOVE':
      return state.filter(i => i.lineId !== action.lineId)
    case 'CLEAR':
      return []
    default:
      return state
  }
}

// ── ItemCarrito memoizado ─────────────────────────────────────────────────────

const ItemCarrito = memo(function ItemCarrito({ item, onRemove }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded border border-gray-200 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{item.descripcion}</p>
        <p className="text-xs text-gray-500">
          {item.unidadMedida === 'KG'
            ? `${item.cantidad.toFixed(3)} kg × $${Number(item.precioUnitario).toFixed(2)}/kg`
            : `${item.cantidad} un × $${Number(item.precioUnitario).toFixed(2)}`
          }
          {item.correctionApplied && (
            <span className="ml-2 text-amber-600 font-medium">⚠ precio corregido</span>
          )}
        </p>
      </div>
      <p className="text-sm font-bold text-gray-900 w-20 text-right">
        ${Number(item.subtotal).toFixed(2)}
      </p>
      <button onClick={() => onRemove(item.lineId)}
        className="text-gray-400 hover:text-red-500 text-lg font-bold ml-2">
        ×
      </button>
    </div>
  )
})

// ── Componente principal ─────────────────────────────────────────────────────

export default function PosPage() {
  const { user, token } = useAuth()
  const { sucursal_id }  = useBranch()

  const [carrito, dispatch] = useReducer(carritoReducer, [])
  const [pagos, setPagos]   = useState({})
  const [barcodeError, setBarcodeError] = useState(null)
  const [saleResult, setSaleResult]     = useState(null)
  const [vendiendo, setVendiendo]       = useState(false)

  const [clienteCC, setClienteCC]           = useState(null)
  const [clienteQuery, setClienteQuery]     = useState('')
  const [clienteResults, setClienteResults] = useState([])
  const [buscandoCliente, setBuscandoCliente] = useState(false)

  const [manualQuery, setManualQuery]       = useState('')
  const [manualResults, setManualResults]   = useState([])
  const [manualQty, setManualQty]           = useState('')
  const [manualSelected, setManualSelected] = useState(null)
  const manualInputRef = useRef(null)

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog', sucursal_id],
    queryFn:  () => fetchCatalog(sucursal_id, token),
    enabled:  true,
    staleTime: Infinity,
  })

  // ── Barcode handler ────────────────────────────────────────────────────────
  const handleScan = useCallback((raw) => {
    setBarcodeError(null)
    const parsed = parseBarcode(raw)

    if (parsed.type === 'scale') {
      const resolved = resolveScaleBarcode(parsed, catalog)
      if (!resolved.producto) { setBarcodeError(`PLU ${parsed.plu} no encontrado en catálogo.`); return }
      if (resolved.error === 'AMBIGUOUS_CORRECTION') { setBarcodeError('Precio ambiguo en código de balanza. Cargá manualmente.'); return }
      dispatch({ type: 'ADD', item: {
        productoId:        resolved.producto.id,
        descripcion:       resolved.producto.descripcion,
        cantidad:          resolved.pesoKg,
        precioUnitario:    resolved.producto.precio,
        subtotal:          resolved.precioFinal,
        unidadMedida:      'KG',
        esBalanza:         true,
        correctionApplied: resolved.correctionApplied,
      }})
      return
    }

    if (parsed.type === 'ean13_manufacturer') {
      const prod = catalog.find(p => p.codigoEan === raw)
      if (!prod) { setBarcodeError(`EAN ${raw} no encontrado.`); return }
      dispatch({ type: 'ADD', item: {
        productoId:     prod.id,
        descripcion:    prod.descripcion,
        cantidad:       1,
        precioUnitario: prod.precio,
        subtotal:       prod.precio,
        unidadMedida:   prod.unidadMedida,
        esBalanza:      false,
      }})
      return
    }

    setBarcodeError(`Código no reconocido: ${raw}`)
  }, [catalog])

  useBarcodeScanner(handleScan)

  // ── Búsqueda manual de producto ────────────────────────────────────────────
  function handleManualSearch(q) {
    setManualQuery(q)
    setManualSelected(null)
    if (q.trim().length < 2) { setManualResults([]); return }
    const lq = q.toLowerCase()
    setManualResults(catalog.filter(p =>
      p.activo && (p.descripcion.toLowerCase().includes(lq) || (p.plu ?? '').includes(lq))
    ).slice(0, 8))
  }

  function selectManualProduct(prod) {
    setManualSelected(prod)
    setManualResults([])
    setManualQuery(prod.descripcion)
    setManualQty(prod.unidadMedida === 'UN' ? '1' : '')
    setTimeout(() => manualInputRef.current?.focus(), 50)
  }

  function addManual() {
    if (!manualSelected) return
    const qty = parseFloat(manualQty)
    if (!qty || qty <= 0) return
    if (manualSelected.unidadMedida === 'UN' && !Number.isInteger(qty)) return
    dispatch({ type: 'ADD', item: {
      productoId:     manualSelected.id,
      descripcion:    manualSelected.descripcion,
      cantidad:       qty,
      precioUnitario: manualSelected.precio,
      subtotal:       qty * manualSelected.precio,
      unidadMedida:   manualSelected.unidadMedida,
      esBalanza:      false,
    }})
    setManualQuery('')
    setManualQty('')
    setManualSelected(null)
    setManualResults([])
  }

  // ── Búsqueda de cliente para CC ────────────────────────────────────────────
  async function handleClienteSearch(q) {
    setClienteQuery(q)
    setClienteCC(null)
    if (q.trim().length < 2) { setClienteResults([]); return }
    setBuscandoCliente(true)
    const results = await searchClientes(q, token)
    setClienteResults(results)
    setBuscandoCliente(false)
  }

  function selectCliente(c) {
    setClienteCC(c)
    setClienteQuery(c.nombre)
    setClienteResults([])
  }

  // ── Pagos ─────────────────────────────────────────────────────────────────
  const total  = carrito.reduce((acc, i) => acc + i.subtotal, 0)
  const pagado = Object.values(pagos).reduce((acc, v) => acc + (parseFloat(v) || 0), 0)
  const vuelto = Math.max(0, pagado - total)

  const tieneCuentaCorriente = !!(pagos['cuenta_corriente'] && parseFloat(pagos['cuenta_corriente']) > 0)
  const puedeVender = (
    carrito.length > 0 &&
    pagado >= total - 0.01 &&
    (!tieneCuentaCorriente || clienteCC)
  )

  function setPago(medio, valor) {
    setPagos(prev => {
      const next = { ...prev }
      if (!valor || valor === '0') { delete next[medio]; return next }
      next[medio] = valor
      return next
    })
    if (medio === 'cuenta_corriente' && (!valor || valor === '0')) {
      setClienteCC(null)
      setClienteQuery('')
      setClienteResults([])
    }
  }

  const handleRemove = useCallback((lineId) => {
    dispatch({ type: 'REMOVE', lineId })
  }, [])

  async function handleVender() {
    if (!puedeVender || vendiendo) return
    setVendiendo(true)

    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 600)) // pausa visual
      const pagadoCC = parseFloat(pagos['cuenta_corriente']) || 0
      const ventaId  = 'DEMO-' + Math.random().toString(36).slice(2, 10).toUpperCase()

      const result = {
        ventaId,
        totalImporte: total,
        vuelto: Math.max(0, pagado - total),
        items: carrito.map(i => ({ descripcion: i.descripcion, subtotal: i.subtotal })),
      }

      if (pagadoCC > 0 && clienteCC) {
        result.cuentaCorriente = {
          clienteNombre:    clienteCC.nombre,
          clienteDocumento: clienteCC.documento,
          saldoAnterior:    clienteCC.saldoCuentaCorriente,
          debito:           pagadoCC,
          saldoResultante:  clienteCC.saldoCuentaCorriente + pagadoCC,
        }
      }

      setSaleResult(result)
      dispatch({ type: 'CLEAR' })
      setPagos({})
      setClienteCC(null)
      setClienteQuery('')
      setVendiendo(false)
      setTimeout(() => window.print(), 100)
      return
    }

    // Flujo real (cuando el backend esté conectado)
    try {
      const res = await fetch('/api/pos/sales', {
        method:  'POST',
        headers: authHeaders(token),
        body:    JSON.stringify({
          sucursalId: sucursal_id,
          clienteId:  clienteCC?.id ?? undefined,
          items:      carrito.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
          pagos:      Object.entries(pagos)
            .map(([medioPago, monto]) => ({ medioPago, monto: parseFloat(monto) }))
            .filter(p => p.monto > 0),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al registrar venta')
      }
      const data = await res.json()
      setSaleResult(data)
      dispatch({ type: 'CLEAR' })
      setPagos({})
      setClienteCC(null)
      setClienteQuery('')
      setTimeout(() => window.print(), 100)
    } catch (err) {
      console.error(err)
    } finally {
      setVendiendo(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="no-print flex h-full bg-gray-50">

        {/* Panel izquierdo: carga y pagos */}
        <div className="flex flex-col w-96 border-r border-gray-200 bg-white">

          {/* Búsqueda manual */}
          <div className="p-4 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Carga manual</p>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto o PLU..."
                value={manualQuery}
                onChange={e => handleManualSearch(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
              {manualResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-56 overflow-y-auto">
                  {manualResults.map(p => (
                    <button key={p.id} onClick={() => selectManualProduct(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <span className="font-medium">{p.descripcion}</span>
                      <span className="text-gray-400 text-xs ml-2">
                        PLU {p.plu} · ${p.precio}/{p.unidadMedida === 'KG' ? 'kg' : 'un'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {manualSelected && (
              <div className="mt-2 flex gap-2">
                <input
                  ref={manualInputRef}
                  type="number"
                  step={manualSelected.unidadMedida === 'KG' ? '0.001' : '1'}
                  min="0"
                  placeholder={manualSelected.unidadMedida === 'KG' ? 'Kg' : 'Unidades'}
                  value={manualQty}
                  onChange={e => setManualQty(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addManual()}
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
                <button onClick={addManual}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded hover:bg-gray-700">
                  Agregar
                </button>
              </div>
            )}
          </div>

          {/* Error de escáner */}
          {barcodeError && (
            <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex justify-between">
              <span>{barcodeError}</span>
              <button onClick={() => setBarcodeError(null)} className="text-red-400 hover:text-red-700 ml-2">✕</button>
            </div>
          )}

          {/* Medios de pago */}
          <div className="p-4 border-b border-gray-200 flex-1 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Medios de pago</p>
            <div className="space-y-2">
              {MEDIOS.map(m => (
                <div key={m.key}>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-700 w-36 flex-shrink-0">{m.label}</label>
                    <span className="text-sm text-gray-400">$</span>
                    <input
                      type="number" min="0" step="0.01" placeholder="0"
                      value={pagos[m.key] ?? ''}
                      onChange={e => setPago(m.key, e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  </div>

                  {m.key === 'cuenta_corriente' && tieneCuentaCorriente && (
                    <div className="mt-2 ml-36 relative">
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={clienteQuery}
                        onChange={e => handleClienteSearch(e.target.value)}
                        className={`w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                          clienteCC ? 'border-green-400 bg-green-50' : 'border-gray-300'
                        }`}
                      />
                      {buscandoCliente && <p className="text-xs text-gray-400 mt-1">Buscando...</p>}
                      {clienteCC && (
                        <p className="text-xs text-green-700 mt-1 font-medium">
                          {clienteCC.nombre} · Saldo: ${Number(clienteCC.saldoCuentaCorriente).toFixed(2)}
                        </p>
                      )}
                      {!clienteCC && tieneCuentaCorriente && (
                        <p className="text-xs text-amber-600 mt-1">Seleccioná un cliente para continuar</p>
                      )}
                      {clienteResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded shadow-lg mt-1 max-h-48 overflow-y-auto">
                          {clienteResults.map(c => (
                            <button key={c.id} onClick={() => selectCliente(c)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                              <span className="font-medium">{c.nombre}</span>
                              {c.documento && <span className="text-gray-400 text-xs ml-2">DNI {c.documento}</span>}
                              <span className="text-xs text-gray-500 block">
                                Saldo: ${Number(c.saldoCuentaCorriente).toFixed(2)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totales y botón vender */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total</span>
              <span className="font-semibold text-gray-900 text-lg">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Pagado</span>
              <span className="font-medium">${pagado.toFixed(2)}</span>
            </div>
            {vuelto > 0 && (
              <div className="flex justify-between text-sm text-green-700 font-semibold">
                <span>Vuelto</span>
                <span>${vuelto.toFixed(2)}</span>
              </div>
            )}
            {tieneCuentaCorriente && !clienteCC && (
              <p className="text-xs text-amber-600">Falta seleccionar cliente para cuenta corriente.</p>
            )}
            <button
              onClick={handleVender}
              disabled={!puedeVender || vendiendo}
              className="w-full py-4 text-lg font-bold rounded bg-gray-900 text-white disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors mt-2"
            >
              {vendiendo ? 'Registrando...' : 'VENDER'}
            </button>
          </div>
        </div>

        {/* Panel derecho: carrito */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Carrito</h2>
            {catalog.length > 0 && (
              <span className="text-xs text-gray-400">{catalog.length} productos cargados</span>
            )}
          </div>
          {carrito.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-2">🛒</p>
                <p className="text-sm">Escaneá o buscá un producto para comenzar</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {carrito.map(item => (
                <ItemCarrito key={item.lineId} item={item} onRemove={handleRemove} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ticket de impresión */}
      {saleResult && (
        <div className="print-only ticket">
          {saleResult.cuentaCorriente
            ? <TicketCuentaCorriente data={saleResult} />
            : <TicketEstandar data={saleResult} />
          }
        </div>
      )}
    </>
  )
}

// ── Ticket estándar ──────────────────────────────────────────────────────────

function TicketEstandar({ data }) {
  return (
    <>
      <div className="text-center mb-3">
        <p className="font-bold text-base">COMPROBANTE DE VENTA</p>
        <p className="text-xs">No válido como factura</p>
        <p className="text-xs mt-1">#{data.ventaId?.slice(-8).toUpperCase()}</p>
      </div>
      <Separador />
      <ItemsTicket items={data.items} />
      <Separador />
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>${Number(data.totalImporte).toFixed(2)}</span>
      </div>
      {data.vuelto > 0 && (
        <div className="flex justify-between text-sm mt-1">
          <span>Vuelto</span>
          <span>${Number(data.vuelto).toFixed(2)}</span>
        </div>
      )}
      <p className="text-center mt-4 text-xs">¡Gracias por su compra!</p>
    </>
  )
}

// ── Ticket cuenta corriente ──────────────────────────────────────────────────

function TicketCuentaCorriente({ data }) {
  const cc = data.cuentaCorriente
  return (
    <>
      <div className="text-center mb-3">
        <p className="font-bold text-base">CUENTA CORRIENTE</p>
        <p className="text-xs">No válido como factura</p>
        <p className="text-xs mt-1">#{data.ventaId?.slice(-8).toUpperCase()}</p>
      </div>
      <Separador />
      <p className="font-bold text-sm">{cc.clienteNombre}</p>
      {cc.clienteDocumento && <p className="text-xs">DNI: {cc.clienteDocumento}</p>}
      <Separador />
      <ItemsTicket items={data.items} />
      <Separador />
      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>${Number(data.totalImporte).toFixed(2)}</span>
      </div>
      <p className="text-xs mt-1">Forma de pago: Cuenta Corriente</p>
      <Separador />
      <div className="text-xs space-y-0.5">
        <div className="flex justify-between">
          <span>Saldo anterior</span>
          <span>${Number(cc.saldoAnterior).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Débito</span>
          <span>${Number(cc.debito).toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Nuevo saldo</span>
          <span>${Number(cc.saldoResultante).toFixed(2)}</span>
        </div>
      </div>
      <Separador />
      <div className="mt-6">
        <p className="text-xs mb-8">Firma de conformidad:</p>
        <div className="border-t border-black pt-1">
          <p className="text-xs text-center">{cc.clienteNombre}</p>
        </div>
      </div>
    </>
  )
}

// ── Helpers de ticket ────────────────────────────────────────────────────────

function ItemsTicket({ items = [] }) {
  return (
    <div className="my-2 space-y-0.5">
      {items.map((item, idx) => (
        <div key={idx} className="flex justify-between text-xs">
          <span className="flex-1 pr-2 truncate">{item.descripcion ?? item.productoId}</span>
          <span>${Number(item.subtotal).toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

function Separador() {
  return <div className="border-t border-dashed border-gray-500 my-2" />
}
