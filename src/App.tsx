import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import PosPage from './pages/PosPage';
import UpdateNotifier from './components/UpdateNotifier';
import { useFlechasEnLaPantalla } from './lib/flechasEnLaPantalla';
import { PRODUCT_NAME } from './config/textos';

export default function App() {
  const { ready, user } = useAuth();
  // Una sola vez, arriba de todo: las flechas saltan por toda la pantalla
  // como el mouse, en cualquier vista de la app (ver lib/flechasEnLaPantalla).
  useFlechasEnLaPantalla();

  return (
    <>
      {!ready ? (
        <div className="login-wrap">
          <div className="panel login-card">
            <h1>{PRODUCT_NAME}</h1>
            <p>Iniciando…</p>
          </div>
        </div>
      ) : user ? (
        <PosPage />
      ) : (
        <LoginPage />
      )}
      <UpdateNotifier />
    </>
  );
}
