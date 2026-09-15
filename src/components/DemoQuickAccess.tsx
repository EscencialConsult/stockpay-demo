import { useState } from 'react';

const DEMO_PIN = '2121';

const ROLE_BUTTONS = [
  { label: 'Administrador', username: 'admin', password: 'admin' },
  { label: 'Encargado', username: 'encargado', password: 'encargado' },
  { label: 'Cajero', username: 'cajero', password: 'cajero' },
];

type Props = {
  onSelectRole: (username: string, password: string) => void;
  busy: boolean;
};

/**
 * "Accesos rápidos demo": un botón discreto en el login que, atrás de un PIN
 * (no visible mientras se escribe), muestra un botón por rol para entrar
 * directo sin tipear usuario/contraseña — pensado para que un vendedor
 * cambie de rol rápido delante de un prospecto.
 */
export default function DemoQuickAccess({ onSelectRole, busy }: Props) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [pinError, setPinError] = useState(false);

  const close = () => {
    setOpen(false);
    setPin('');
    setUnlocked(false);
    setPinError(false);
  };

  const checkPin = (value: string) => {
    setPin(value);
    setPinError(false);
    if (value === DEMO_PIN) {
      setUnlocked(true);
    } else if (value.length >= DEMO_PIN.length) {
      setPinError(true);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="b fantasma"
        style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
        onClick={() => setOpen(true)}
      >
        Accesos rápidos demo
      </button>
    );
  }

  return (
    <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
      {!unlocked ? (
        <div className="field">
          <label htmlFor="demo-pin">PIN de accesos rápidos</label>
          <input
            id="demo-pin"
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => checkPin(e.target.value)}
            placeholder="····"
          />
          {pinError && <p className="error" style={{ marginTop: '0.4rem' }}>PIN incorrecto</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ROLE_BUTTONS.map((r) => (
            <button
              key={r.username}
              type="button"
              className="b pri"
              disabled={busy}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => onSelectRole(r.username, r.password)}
            >
              Entrar como {r.label}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="b fantasma"
        style={{ width: '100%', marginTop: '0.75rem', justifyContent: 'center' }}
        onClick={close}
      >
        Cerrar
      </button>
    </div>
  );
}
