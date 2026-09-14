import { useState } from 'react'
import { MOCK_CLIENTES } from '../../mocks/data.js'

const MOCK_MOVIMIENTOS = {
  'cli-01': [
    { fecha: '2025-06-12', tipo: 'debito',  descripcion: 'Venta #A9B2C3',   monto: 4800, saldo: 12500 },
    { fecha: '2025-06-11', tipo: 'credito', descripcion: 'Pago en efectivo', monto: 5000, saldo: 7700 },
    { fecha: '2025-06-10', tipo: 'debito',  descripcion: 'Venta #D4E5F6',   monto: 7700, saldo: 12700 },
    { fecha: '2025-06-09', tipo: 'credito', descripcion: 'Pago con transferencia', monto: 10000, saldo: 5000 },
  ],
  'cli-03': [
    { fecha: '2025-06-12', tipo: 'debito',  descripcion: 'Venta #G7H8I9',   monto: 18200, saldo: 48200 },
    { fecha: '2025-06-11', tipo: 'debito',  descripcion: 'Venta #J0K1L2',   monto: 12400, saldo: 30000 },
    { fecha: '2025-06-10', tipo: 'credito', descripcion: 'Pago en efectivo', monto: 20000, saldo: 17600 },
  ],
}

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)
}

export default function CuentasPage() {
  const [clientes, setClientes] = useState(MOCK_CLIENTES)
  const [seleccionado, setSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)  // null | 'pago'
  const [montoPago, setMontoPago] = useState('')

  const filtrados = clientes.filter(c => {
    if (!busqueda) return true
    const lq = busqueda.toLowerCase()
    return c.nombre.toLowerCase().includes(lq) || c.documento.includes(lq)
  })

  const cliente = clientes.find(c => c.id === seleccionado)
  const movimientos = MOCK_MOVIMIENTOS[seleccionado] ?? []

  function registrarPago() {
    const monto = parseFloat(montoPago)
    if (!monto || monto <= 0 || !cliente) return
    setClientes(prev => prev.map(c =>
      c.id === cliente.id
        ? { ...c, saldoCuentaCorriente: Math.max(0, c.saldoCuentaCorriente - monto) }
        : c
    ))
    setModal(null)
    setMontoPago('')
  }

  return (
    <div className="max-w-5xl">

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Cuentas corrientes</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {clientes.filter(c => c.saldoCuentaCorriente > 0).length} clientes con saldo pendiente ·{' '}
          {fmt(clientes.reduce((acc, c) => acc + c.saldoCuentaCorriente, 0))} total a cobrar
        </p>
      </div>

      <div className="flex gap-4">

        {/* Lista de clientes */}
        <div className="w-72 flex-shrink-0">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 mb-3"
          />
          <div className="space-y-1">
            {filtrados.map(c => (
              <button
                key={c.id}
                onClick={() => setSeleccionado(c.id)}
                className={`w-full text-left rounded-lg px-4 py-3 transition-colors ${
                  seleccionado === c.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'
                }`}
              >
                <p className="text-sm font-semibold truncate">{c.nombre}</p>
                <p className={`text-xs mt-0.5 ${seleccionado === c.id ? 'text-gray-300' : 'text-gray-400'}`}>
                  DNI {c.documento}
                </p>
                <p className={`text-sm font-bold mt-1 ${
                  c.saldoCuentaCorriente > 0
                    ? seleccionado === c.id ? 'text-white' : 'text-gray-900'
                    : 'text-gray-400'
                }`}>
                  {fmt(c.saldoCuentaCorriente)}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Detalle */}
        <div className="flex-1">
          {!cliente ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Seleccioná un cliente para ver el detalle
            </div>
          ) : (
            <>
              {/* Header cliente */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{cliente.nombre}</h2>
                    <p className="text-sm text-gray-500">DNI {cliente.documento} · {cliente.telefono}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-0.5">Saldo pendiente</p>
                    <p className={`text-2xl font-bold ${
                      cliente.saldoCuentaCorriente > 0 ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {fmt(cliente.saldoCuentaCorriente)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setModal('pago')}
                    disabled={cliente.saldoCuentaCorriente === 0}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Registrar pago
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-50">
                    Editar cliente
                  </button>
                </div>
              </div>

              {/* Movimientos */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Movimientos recientes</h3>
                </div>
                {movimientos.length === 0 ? (
                  <div className="px-5 py-8 text-center text-gray-400 text-sm">
                    Sin movimientos registrados
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                        <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Saldo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientos.map((m, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 text-xs">{m.fecha}</td>
                          <td className="px-4 py-3 text-gray-700">{m.descripcion}</td>
                          <td className={`px-4 py-3 text-right font-semibold ${
                            m.tipo === 'debito' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {m.tipo === 'debito' ? '+' : '-'}{fmt(m.monto)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(m.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal pago */}
      {modal === 'pago' && cliente && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Registrar pago</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Cliente: <strong className="text-gray-900">{cliente.nombre}</strong><br />
              Saldo actual: <strong className="text-gray-900">{fmt(cliente.saldoCuentaCorriente)}</strong>
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Monto del pago</label>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={montoPago}
                  onChange={e => setMontoPago(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={registrarPago}
                disabled={!montoPago || parseFloat(montoPago) <= 0}
                className="px-4 py-2 text-sm bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
