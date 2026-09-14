import { useState } from 'react'
import { MOCK_YIELD_PROFILES, MOCK_INGRESOS_MEDIA, MOCK_SUCURSALES } from '../../mocks/data.js'

const TIPOS = [
  { value: 'vacuno', label: 'Media res vacuna' },
  { value: 'cerdo',  label: 'Media res porcina' },
  { value: 'pollo',  label: 'Pollo (por kilo entero)' },
]

function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function kgFmt(n) {
  return `${Number(n).toFixed(2)} kg`
}

const PRECIOS = {
  p01: 3200, p02: 5800, p03: 4200, p04: 2800, p05: 3600,
  p06: 6200, p07: 2400, p08: 3100, p09: 2600, p10: 2200,
  p11: 2400, p12: 2200, p16: 3000, p17: 2600, p18: 2800, p19: 1800,
}

export default function DespieccePage() {
  const [tipo, setTipo]           = useState('vacuno')
  const [sucursalId, setSucursal] = useState(MOCK_SUCURSALES[0].id)
  const [pesoReal, setPesoReal]   = useState('')
  const [pesoDesbaste, setPesoDesbaste] = useState('')
  const [historial, setHistorial] = useState(MOCK_INGRESOS_MEDIA)
  const [confirmado, setConfirmado] = useState(false)

  const perfil = MOCK_YIELD_PROFILES[tipo]
  const pesoD  = parseFloat(pesoDesbaste) || 0
  const merma  = parseFloat(pesoReal) && pesoD ? parseFloat(pesoReal) - pesoD : 0

  const cortes = perfil
    ? perfil.cortes.map(c => ({
        ...c,
        kg:    parseFloat(((c.porcentaje / 100) * pesoD).toFixed(3)),
        valor: Math.round((c.porcentaje / 100) * pesoD * (PRECIOS[c.productoId] ?? 0)),
      }))
    : []

  const totalKgCortes = cortes.reduce((a, c) => a + c.kg, 0)
  const totalValor    = cortes.reduce((a, c) => a + c.valor, 0)
  const kgHueso       = perfil ? parseFloat(((perfil.mermaHueso / 100) * pesoD).toFixed(3)) : 0

  function handleConfirmar() {
    if (!pesoReal || !pesoDesbaste || !sucursalId) return
    const suc = MOCK_SUCURSALES.find(s => s.id === sucursalId)
    const nuevo = {
      id:              `im-${Date.now()}`,
      tipo,
      sucursalId,
      sucursalNombre:  suc?.nombre ?? sucursalId,
      pesoReal:        parseFloat(pesoReal),
      pesoDesbaste:    parseFloat(pesoDesbaste),
      fecha:           new Date().toISOString().slice(0, 10),
      estado:          'procesado',
      usuario:         'Daniela Ruiz',
    }
    setHistorial(prev => [nuevo, ...prev])
    setPesoReal('')
    setPesoDesbaste('')
    setConfirmado(true)
    setTimeout(() => setConfirmado(false), 3000)
  }

  const puedeConfirmar = pesoReal && pesoDesbaste && parseFloat(pesoDesbaste) <= parseFloat(pesoReal)

  return (
    <div className="max-w-5xl">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Despiece</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Registrá el ingreso de una media res y el sistema calcula el stock teórico de cortes
        </p>
      </div>

      {confirmado && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium">
          ✓ Ingreso registrado. El stock teórico fue actualizado.
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 1.4fr' }}>

        {/* Formulario de ingreso */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Registrar ingreso</h2>

          <div className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Tipo de animal
              </label>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setTipo(t.value)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all text-center ${
                      tipo === t.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Sucursal que recibe
              </label>
              <select
                value={sucursalId}
                onChange={e => setSucursal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {MOCK_SUCURSALES.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>

            {/* Pesos */}
            <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Peso real (kg)
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={pesoReal}
                  onChange={e => setPesoReal(e.target.value)}
                  placeholder="144.0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Peso al desbaste (kg)
                </label>
                <input
                  type="number" step="0.1" min="0"
                  value={pesoDesbaste}
                  onChange={e => setPesoDesbaste(e.target.value)}
                  placeholder="138.5"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                    pesoDesbaste && parseFloat(pesoDesbaste) > parseFloat(pesoReal)
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {pesoDesbaste && parseFloat(pesoDesbaste) > parseFloat(pesoReal) && (
                  <p className="text-xs text-red-600 mt-1">El desbaste no puede superar el peso real.</p>
                )}
              </div>
            </div>

            {/* Resumen de merma */}
            {pesoReal && pesoDesbaste && parseFloat(pesoDesbaste) <= parseFloat(pesoReal) && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Merma cuero / oreo</span>
                  <span className="font-mono font-semibold text-gray-700">{kgFmt(merma)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Merma en %</span>
                  <span className="font-mono text-gray-700">
                    {((merma / parseFloat(pesoReal)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmar}
              disabled={!puedeConfirmar}
              className="w-full py-3 bg-gray-900 text-white text-sm font-bold rounded-lg hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Registrar ingreso y actualizar stock
            </button>
          </div>
        </div>

        {/* Preview de cortes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">
              {perfil ? perfil.nombre : 'Seleccioná un tipo'}
              {pesoD > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  base: {kgFmt(pesoD)}
                </span>
              )}
            </h2>
          </div>

          {tipo === 'pollo' ? (
            <div className="p-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Pollo — sin despiece</p>
                <p className="text-blue-600">El pollo ingresa y egresa por kilo entero. El sistema descuenta stock directamente sin conversión por cortes.</p>
              </div>
              {pesoD > 0 && (
                <div className="mt-4 bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-gray-900 font-mono">{kgFmt(pesoD)}</p>
                  <p className="text-sm text-gray-500 mt-1">serán agregados al stock de Pollo entero</p>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-auto" style={{ maxHeight: 380 }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Corte</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Kg generados</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor pot.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cortes.map(c => (
                    <tr key={c.productoId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{c.descripcion}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 font-mono text-xs">{c.porcentaje}%</td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-900">
                        {pesoD > 0 ? kgFmt(c.kg) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">
                        {pesoD > 0 ? fmt(c.valor) : <span className="text-gray-200">—</span>}
                      </td>
                    </tr>
                  ))}
                  {perfil && (
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-4 py-2.5 text-gray-400 text-xs">Hueso / merma</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs font-mono">{perfil.mermaHueso}%</td>
                      <td className="px-4 py-2.5 text-right text-gray-400 text-xs font-mono">
                        {pesoD > 0 ? kgFmt(kgHueso) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-300 text-xs">—</td>
                    </tr>
                  )}
                </tbody>
                {pesoD > 0 && (
                  <tfoot className="border-t-2 border-gray-200">
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-xs font-semibold text-gray-600">TOTAL CORTES</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-600 font-mono">
                        {(100 - perfil.mermaHueso).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                        {kgFmt(totalKgCortes)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {fmt(totalValor)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historial de ingresos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sucursal</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso real</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Desbaste</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Merma</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {historial.map(i => {
              const mermaKg = i.pesoReal - i.pesoDesbaste
              const mermaPct = ((mermaKg / i.pesoReal) * 100).toFixed(1)
              return (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{i.fecha}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                      i.tipo === 'vacuno' ? 'bg-red-50 text-red-700' :
                      i.tipo === 'cerdo'  ? 'bg-orange-50 text-orange-700' :
                                             'bg-yellow-50 text-yellow-700'
                    }`}>
                      {i.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{i.sucursalNombre}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{kgFmt(i.pesoReal)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gray-700">{kgFmt(i.pesoDesbaste)}</td>
                  <td className="px-4 py-3 text-right text-gray-400 font-mono text-xs">
                    {kgFmt(mermaKg)} <span className="text-gray-300">({mermaPct}%)</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                      Procesado
                    </span>
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
