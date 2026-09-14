import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../core/AuthContext.jsx'
import { MOCK_USERS } from '../../mocks/data.js'

// Sin backend aún: autenticación visual contra usuarios demo
const DEMO_MODE = true

const REDIRECT_POR_ROL = {
  cajero:           '/pos',
  administrador:    '/dashboard',
  subadministrador: '/dashboard',
  socio:            '/dashboard',
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate  = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setCargando(true)

    if (DEMO_MODE) {
      await new Promise(r => setTimeout(r, 400)) // pausa visual
      const entry = MOCK_USERS[email.trim().toLowerCase()]
      if (!entry || entry.password !== password) {
        setError('Credenciales inválidas.')
        setCargando(false)
        return
      }
      const { password: _, ...userObj } = entry
      login(userObj, 'mock-token-demo')
      navigate(REDIRECT_POR_ROL[userObj.rol] ?? '/dashboard', { replace: true })
      setCargando(false)
      return
    }

    // Flujo real (cuando el backend esté conectado)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al iniciar sesión.'); return }
      login(data.user, data.token)
      navigate(REDIRECT_POR_ROL[data.user.rol] ?? '/dashboard', { replace: true })
    } catch {
      setError('No se pudo conectar con el servidor.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white border border-gray-200 rounded-lg p-10 w-full max-w-sm shadow-sm">

        <div className="flex justify-center mb-8">
          <img src="/one-logonegro.webp" alt="ONE" className="h-8 opacity-90" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-1 text-center font-titulo">
          Sistema de Gestión
        </h1>
        <p className="text-sm text-gray-500 text-center mb-8">Ingresá con tu cuenta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-3 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {DEMO_MODE && (
          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600 mb-1">Usuarios de demostración:</p>
            <p>admin@test.com / Admin1234! → Administrador</p>
            <p>cajero@test.com / Admin1234! → Cajero (POS)</p>
            <p>socio@test.com / Admin1234! → Socio (solo lectura)</p>
          </div>
        )}
      </div>
    </div>
  )
}
