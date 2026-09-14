import { useState } from 'react';
import { api } from '../api/client';
import { getPosBridge } from '../bridge';
import { MODES, MODE_LABELS } from '../config/modes';
import Selector from '../components/Selector';
import { sanitizeDecimal, sanitizeInteger } from '../lib/numericInput';

type Props = {
  /** Se llama después de guardar la configuración inicial, para que el padre recargue. */
  onDone: () => Promise<void>;
};

const STEPS = ['bienvenida', 'negocio', 'moneda', 'modo', 'listo'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  bienvenida: 'Bienvenida',
  negocio: 'Negocio',
  moneda: 'Moneda',
  modo: 'Caja',
  listo: 'Listo',
};

/**
 * Primera pantalla que ve alguien al abrir la app recién instalada, en vez de
 * la pantalla de Configuración cruda. Guarda lo mínimo para operar (nombre
 * del negocio, moneda, modo de caja) y deja el resto para Configuración.
 */
export default function OnboardingWizard({ onDone }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    store: '',
    address_one: '',
    contact: '',
    symbol: '$',
    charge_tax: false,
    tax: '',
    percentage: '0',
    app: MODES[0] as string,
    till: '1',
  });

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const next = () => {
    if (step === 'negocio' && !form.store.trim()) {
      setError('Poné al menos el nombre del negocio para continuar');
      return;
    }
    setError(null);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('app', form.app);
      fd.append('store', form.store.trim());
      fd.append('address_one', form.address_one);
      fd.append('address_two', '');
      fd.append('contact', form.contact);
      fd.append('tax', form.tax);
      fd.append('symbol', form.symbol || '$');
      fd.append('percentage', form.percentage || '0');
      fd.append('charge_tax', form.charge_tax ? '1' : '0');
      fd.append('footer', '');
      fd.append('img', '');
      fd.append('till', form.till || '1');
      fd.append('ip', '');

      await getPosBridge().setLocalConfig({
        mode: form.app,
        serverIp: '',
        till: parseInt(form.till, 10) || 1,
      });
      await api.saveSettings(fd);
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la configuración inicial');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <div className="panel login-card" style={{ width: 'min(520px, 100%)' }}>
        <div className="onboarding-steps">
          {STEPS.map((s, i) => (
            <span key={s} className={`onboarding-step ${i <= stepIndex ? 'done' : ''}`}>
              {STEP_LABELS[s]}
            </span>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        {step === 'bienvenida' && (
          <>
            <h1>Bienvenido</h1>
            <p>
              Antes de empezar a vender, configuremos lo básico: el nombre del negocio, la
              moneda y cómo va a operar esta caja. Lleva menos de un minuto — el resto se
              puede ajustar después desde Configuración.
            </p>
          </>
        )}

        {step === 'negocio' && (
          <>
            <h1>Tu negocio</h1>
            <p>Esto aparece en la barra lateral y en el comprobante impreso.</p>
            <div className="field">
              <label>Nombre del negocio</label>
              <input
                value={form.store}
                onChange={(e) => setForm({ ...form, store: e.target.value })}
                placeholder="Ej: Almacén Don José"
                autoFocus
              />
            </div>
            <div className="field">
              <label>Dirección (opcional)</label>
              <input
                value={form.address_one}
                onChange={(e) => setForm({ ...form, address_one: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Contacto (opcional)</label>
              <input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="Teléfono o WhatsApp"
              />
            </div>
          </>
        )}

        {step === 'moneda' && (
          <>
            <h1>Moneda e impuesto</h1>
            <div className="field">
              <label>Símbolo de moneda</label>
              <input
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                style={{ maxWidth: 120 }}
              />
            </div>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <input
                type="checkbox"
                checked={form.charge_tax}
                onChange={(e) => setForm({ ...form, charge_tax: e.target.checked })}
              />
              Cobrar impuesto en las ventas
            </label>
            {form.charge_tax && (
              <>
                <div className="field">
                  <label>Etiqueta del impuesto</label>
                  <input
                    value={form.tax}
                    onChange={(e) => setForm({ ...form, tax: e.target.value })}
                    placeholder="IVA"
                  />
                </div>
                <div className="field">
                  <label>% de impuesto</label>
                  <input
                    value={form.percentage}
                    onChange={(e) => setForm({ ...form, percentage: sanitizeDecimal(e.target.value) })}
                    inputMode="decimal"
                  />
                </div>
              </>
            )}
          </>
        )}

        {step === 'modo' && (
          <>
            <h1>Modo de la caja</h1>
            <p className="muted">
              Si vas a tener una sola caja, dejá "Independiente". Elegí las otras opciones
              solo si vas a conectar varias cajas en red — esto se puede cambiar después.
            </p>
            <div className="field">
              <label>Modo</label>
              <Selector
                value={form.app}
                onChange={(v) => setForm({ ...form, app: v })}
                options={MODES.map((m) => ({ value: m, label: MODE_LABELS[m] }))}
              />
            </div>
            <div className="field">
              <label>Número de caja</label>
              <input
                value={form.till}
                onChange={(e) => setForm({ ...form, till: sanitizeInteger(e.target.value) })}
                inputMode="numeric"
              />
            </div>
          </>
        )}

        {step === 'listo' && (
          <>
            <h1>Todo listo</h1>
            <p>
              <strong>{form.store}</strong> queda configurado. Podés cambiar cualquiera de estos
              datos más adelante desde Configuración.
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
          {stepIndex > 0 && (
            <button type="button" className="b" onClick={back} disabled={busy}>
              Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          {!isLast ? (
            <button type="button" className="b pri" onClick={next}>
              Siguiente
            </button>
          ) : (
            <button type="button" className="b pri" onClick={finish} disabled={busy}>
              {busy ? 'Guardando…' : 'Empezar a usar el sistema'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
