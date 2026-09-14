import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        <img src="/stockpay-logo.png" alt="StockPay" className="h-16 mx-auto mb-6" />

        <h1 className="text-3xl font-bold text-gray-900 font-titulo mb-3">
          StockPay <span className="text-gray-400 font-normal">Web</span>
        </h1>
        <p className="text-base text-gray-500 mb-10 max-w-lg mx-auto">
          La versión web y multi-sucursal de StockPay: control de stock, ventas, cuentas
          corrientes y caja para negocios con más de un local, conectados por internet.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="px-8 py-3 bg-gray-900 text-white text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >
          Ingresar al sistema
        </button>

        <p className="text-xs text-gray-400 mt-6">
          Versión de demostración — no es la aplicación de producción.
        </p>
      </div>
    </div>
  )
}
