import { useState, useEffect } from 'react'

const STORAGE_KEY = 'demo-disclaimer-visto'

// Cartel de aviso que se muestra una sola vez (por navegador) al llegar al login,
// aclarando que esto es una demo web y no la aplicación real.
export function DemoDisclaimer() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      // Si localStorage no está disponible, no hay forma de recordar la elección:
      // se muestra igual, mejor eso que dejar de avisar.
      setVisible(true)
    }
  }, [])

  function cerrar() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3 font-titulo">
          Antes de continuar
        </h2>

        <div className="text-sm text-gray-600 space-y-3 mb-6">
          <p>
            Esta es una <strong>versión web de demostración</strong>. Funciona con la misma
            lógica que el sistema real — ventas, stock, cuentas corrientes, caja — pero es
            solo para mostrar cómo se usa.
          </p>
          <p>
            No incluye integraciones reales (impresora fiscal, AFIP, etc.) y los datos que ves
            acá son de prueba. Esta pantalla es una simulación de la aplicación real: no está
            a la venta, es solo para conocerla.
          </p>
        </div>

        <button
          onClick={cerrar}
          className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >
          Entendido, no volver a mostrar
        </button>
      </div>
    </div>
  )
}
