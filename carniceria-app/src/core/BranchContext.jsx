import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext.jsx'

const BranchContext = createContext(null)

export function BranchProvider({ children }) {
  const { user } = useAuth()
  const [sucursal_id, setSucursalId] = useState(user?.sucursalId ?? null)

  // Sincronizar cuando el usuario cambia (p.ej. después del login)
  useEffect(() => {
    setSucursalId(user?.sucursalId ?? null)
  }, [user?.sucursalId])

  const setSucursal = (id) => {
    // Solo administradores (sucursalId null) pueden cambiar de sucursal
    if (!user || user.sucursalId !== null) return
    setSucursalId(id)
  }

  return (
    <BranchContext.Provider value={{ sucursal_id, setSucursal }}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranch() {
  const ctx = useContext(BranchContext)
  if (!ctx) throw new Error('useBranch debe usarse dentro de BranchProvider')
  return ctx
}
