import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPosBridge } from '../bridge';
import { MODES, MODE_LABELS } from '../config/modes';
import Selector from '../components/Selector';
import { PRODUCT_NAME } from '../config/textos';

export default function LoginPage() {
  const { login, serverError, apiInfo, refreshApiInfo } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConn, setShowConn] = useState(false);
  const [mode, setMode] = useState(apiInfo?.mode || MODES[0]);
  const [serverIp, setServerIp] = useState(apiInfo?.serverIp || '');
  const [connMsg, setConnMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await refreshApiInfo();
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  };

  const saveConnection = async () => {
    setConnMsg(null);
    await getPosBridge().setLocalConfig({
      mode,
      serverIp,
      till: apiInfo?.till || 1,
    });
    setConnMsg('Guardado. Reiniciá la app si cambiaste el modo Servidor / Terminal.');
    await refreshApiInfo();
  };

  const needsConn =
    Boolean(serverError) ||
    apiInfo?.mode === 'Network Point of Sale Terminal';

  return (
    <div className="login-wrap">
      <form className="panel login-card" onSubmit={onSubmit}>
        <img className="login-logo" src="./logo.png" alt="" />
        <h1>{PRODUCT_NAME}</h1>
        <p>Iniciá sesión para abrir la caja</p>

        {(serverError || error) && <div className="error">{serverError || error}</div>}

        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <button className="b pri" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>

        {(needsConn || showConn) && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
            <button
              type="button"
              className="b fantasma"
              style={{ width: '100%', marginBottom: '0.75rem', justifyContent: 'center' }}
              onClick={() => setShowConn((v) => !v)}
            >
              {showConn ? 'Ocultar' : 'Ver'} conexión de red
            </button>
            {showConn && (
              <>
                <div className="field">
                  <label>Modo</label>
                  <Selector
                    value={mode}
                    onChange={setMode}
                    options={MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
                  />
                </div>
                {mode === 'Network Point of Sale Terminal' && (
                  <div className="field">
                    <label>IP del servidor</label>
                    <input
                      value={serverIp}
                      onChange={(e) => setServerIp(e.target.value)}
                      placeholder="192.168.1.10"
                    />
                  </div>
                )}
                {connMsg && <p className="muted">{connMsg}</p>}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="b pri" onClick={saveConnection}>
                    Guardar
                  </button>
                  <button type="button" className="b" onClick={() => refreshApiInfo()}>
                    Reintentar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
