import { useState } from 'react'
import { MOCK_SUCURSALES } from '../../mocks/data.js'

const MOCK_USUARIOS = [
  { id: 'u1', nombre: 'Administrador',  rol: 'administrador',    email: 'admin@test.com',    sucursalId: null,      activo: true },
  { id: 'u2', nombre: 'Sub Admin',      rol: 'subadministrador', email: 'subadmin@test.com', sucursalId: 'suc-001', activo: true },
  { id: 'u3', nombre: 'Socio',          rol: 'socio',            email: 'socio@test.com',    sucursalId: null,      activo: true },
  { id: 'u4', nombre: 'Cajero',         rol: 'cajero',           email: 'cajero@test.com',   sucursalId: 'suc-001', activo: true },
  { id: 'u5', nombre: 'Cajero Norte',   rol: 'cajero',           email: 'cajero2@test.com',  sucursalId: 'suc-002', activo: true },
]

const ROL_BADGE = {
  administrador:    'bg-gray-900 text-white',
  subadministrador: 'bg-gray-700 text-white',
  socio:            'bg-blue-100 text-blue-800',
  cajero:           'bg-green-100 text-green-800',
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState(MOCK_SUCURSALES)
  const [modal, setModal]           = useState(null)
  const [tab, setTab]               = useState('sucursales')

  function toggleActiva(id) {
    setSucursales(prev => prev.map(s => s.id === id ? { ...s, activa: !s.activa } : s))
  }

  return (
    <div className="max-w-4xl">

      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Sucursales y usuarios</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sucursales.filter(s => s.activa).length} sucursales activas</p>
        </div>
        <button
          onClick={() => setModal('nueva')}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >
          + Nueva sucursal
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {['sucursales', 'usuarios'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'sucursales' ? 'Sucursales' : 'Usuarios'}
          </button>
        ))}
      </div>

      {/* Sucursales */}
      {tab === 'sucursales' && (
        <div className="space-y-3">
          {sucursales.map(s => {
            const usuarios = MOCK_USUARIOS.filter(u => u.sucursalId === s.id)
            return (
              <div key={s.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-gray-900">{s.nombre}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.activa ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {s.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''} asignado{usuarios.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActiva(s.id)}
                      className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
                    >
                      {s.activa ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 transition-colors">
                      Editar
                    </button>
                  </div>
                </div>
                {usuarios.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {usuarios.map(u => (
                      <span key={u.id} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {u.nombre} · {u.rol}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Usuarios */}
      {tab === 'usuarios' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sucursal</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_USUARIOS.map(u => {
                const suc = sucursales.find(s => s.id === u.sucursalId)
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{u.nombre}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROL_BADGE[u.rol]}`}>
                        {u.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {suc ? suc.nombre : <span className="text-gray-300">Todas</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`w-2 h-2 rounded-full inline-block ${u.activo ? 'bg-green-400' : 'bg-gray-300'}`} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva sucursal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Nueva sucursal</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Sucursal Oeste"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 text-sm bg-gray-900 text-white font-semibold rounded-md hover:bg-gray-700">
                Crear sucursal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
