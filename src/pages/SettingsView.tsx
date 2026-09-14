import { useEffect, useState } from 'react';
import { api, Settings } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getPosBridge } from '../bridge';
import PhotoPicker from '../components/PhotoPicker';
import { MODES } from '../config/modes';
import { sanitizeDecimal, sanitizeInteger } from '../lib/numericInput';

type Props = {
  settings: Settings | null;
  onSaved: () => Promise<void>;
};

export default function SettingsView({ settings, onSaved }: Props) {
  const { apiInfo, refreshApiInfo } = useAuth();
  const [form, setForm] = useState({
    app: MODES[0] as string,
    store: '',
    address_one: '',
    address_two: '',
    contact: '',
    tax: '',
    symbol: '$',
    percentage: '0',
    charge_tax: false,
    footer: '',
    img: '',
    till: '1',
    ip: '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const info = await refreshApiInfo();
      const s = settings;
      setForm({
        app: s?.app || MODES[0],
        store: s?.store || '',
        address_one: s?.address_one || '',
        address_two: s?.address_two || '',
        contact: s?.contact || '',
        tax: s?.tax || '',
        symbol: s?.symbol || '$',
        percentage: String(s?.percentage ?? 0),
        charge_tax: !!s?.charge_tax,
        footer: s?.footer || '',
        img: s?.img || '',
        till: String(s?.till || info.till || 1),
        ip: s?.ip || info.serverIp || '',
      });
    })();
  }, [settings]);

  const save = async () => {
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'charge_tax') fd.append(k, form.charge_tax ? '1' : '0');
        else fd.append(k, String(v));
      });

      await getPosBridge().setLocalConfig({
        mode: form.app,
        serverIp: form.ip,
        till: parseInt(form.till, 10) || 1,
      });

      await api.saveSettings(fd);

      setMessage('Guardado.');
      await refreshApiInfo();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  const seedDemo = async () => {
    setError(null);
    setMessage(null);
    setDemoBusy(true);
    try {
      const result = await api.seedDemo();
      setMessage(result.message);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo de ejemplo');
    } finally {
      setDemoBusy(false);
    }
  };

  const clearDemo = async () => {
    if (
      !confirm(
        '¿Borrar TODOS los productos, categorías, historial de ventas y clientes (excepto Consumidor final)? Esta acción no se puede deshacer.'
      )
    ) {
      return;
    }
    setError(null);
    setMessage(null);
    setDemoBusy(true);
    try {
      const result = await api.clearDemo();
      setMessage(result.message);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo borrar');
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <div className="panel" style={{ padding: '1.25rem', width: '100%' }}>
      {error && <div className="error">{error}</div>}
      {message && <div className="notice">{message}</div>}

      <div className="page-grid">
        <div>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>Negocio</h3>
          <div className="field">
            <label>Nombre del negocio</label>
            <input
              value={form.store}
              onChange={(e) => setForm({ ...form, store: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Dirección</label>
            <input
              value={form.address_one}
              onChange={(e) => setForm({ ...form, address_one: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Dirección (línea 2)</label>
            <input
              value={form.address_two}
              onChange={(e) => setForm({ ...form, address_two: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Contacto</label>
            <input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Pie del comprobante</label>
            <input
              value={form.footer}
              onChange={(e) => setForm({ ...form, footer: e.target.value })}
            />
          </div>
          <PhotoPicker
            label="Logo del negocio"
            value={form.img}
            onChange={(img) => setForm({ ...form, img })}
            suggestedQuery={form.store || 'store logo'}
          />
        </div>

        <div>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>Caja</h3>
          <div className="field">
            <label>Número de caja</label>
            <input
              value={form.till}
              onChange={(e) => setForm({ ...form, till: sanitizeInteger(e.target.value) })}
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label>Símbolo de moneda</label>
            <input
              value={form.symbol}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
            />
          </div>
          <label
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}
          >
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
          {apiInfo && (
            <p className="muted" style={{ fontSize: '0.85rem' }}>
              API {apiInfo.baseUrl}
            </p>
          )}
        </div>
      </div>

      <button type="button" className="b pri" onClick={save} style={{ marginTop: '1rem' }}>
        Guardar configuración
      </button>

      <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--line)' }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>Datos de ejemplo</h3>
        <p className="muted" style={{ fontSize: '0.9rem', marginTop: 0 }}>
          Cargá un catálogo de ejemplo (categorías, productos, clientes), o borrá el catálogo y las
          ventas para arrancar de cero. El equipo y la configuración se conservan.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className="b" disabled={demoBusy} onClick={seedDemo}>
            Cargar catálogo de ejemplo
          </button>
          <button type="button" className="b malo" disabled={demoBusy} onClick={clearDemo}>
            Borrar catálogo y ventas
          </button>
        </div>
      </div>
    </div>
  );
}
