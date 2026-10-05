import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { api, ExpiryLogEntry, Product } from '../api/client';
import { formatearFecha } from '../lib/vencimientos';

type Props = {
  products: Product[];
  onChanged: () => Promise<void>;
};

const FECHA_KEY = 'pos_vencimiento_lote';

/** La fecha del lote se recuerda en este navegador: si cambiás de pestaña o
 * recargás, sigue ahí para el siguiente producto. Es una comodidad de este
 * puesto, no un dato del negocio, así que falla en silencio. */
function leerFechaGuardada(): string {
  try {
    return localStorage.getItem(FECHA_KEY) || '';
  } catch {
    return '';
  }
}

function guardarFecha(fecha: string) {
  try {
    if (fecha) localStorage.setItem(FECHA_KEY, fecha);
    else localStorage.removeItem(FECHA_KEY);
  } catch {
    /* sin localStorage no es crítico */
  }
}

function horaCarga(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Carga de vencimientos por lote: elegís la fecha UNA vez y después pasás
 * los productos por el escáner (o los buscás). Cada uno queda con esa fecha
 * y aparece en el historial de abajo. Así no hay que tipear la misma fecha
 * para cada producto de un mismo ingreso de mercadería.
 */
export default function CargaVencimientos({ products, onChanged }: Props) {
  const [fecha, setFecha] = useState(leerFechaGuardada);
  const [query, setQuery] = useState('');
  const [coincidencias, setCoincidencias] = useState<Product[]>([]);
  const [log, setLog] = useState<ExpiryLogEntry[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargarHistorial = async () => {
    try {
      setLog(await api.getExpiryLog(30));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el historial');
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cambiarFecha = (valor: string) => {
    setFecha(valor);
    guardarFecha(valor);
    setError(null);
  };

  const asignar = async (producto: Product) => {
    if (!fecha) {
      setError('Primero elegí la fecha de vencimiento del lote');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.setProductExpiry(producto.id, fecha);
      setMensaje(`${producto.name} → vence el ${formatearFecha(fecha)}`);
      setQuery('');
      setCoincidencias([]);
      await onChanged();
      await cargarHistorial();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el vencimiento');
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  // Enter: un escáner manda el código y después Enter, así que primero se
  // busca código exacto (sin ambigüedad). Si no hay, por nombre: si queda
  // uno solo se asigna directo, si hay varios se listan para elegir.
  const buscar = () => {
    const q = query.trim();
    if (!q) return;
    setMensaje(null);
    const exacto = products.find((p) => p.code === q || String(p.id) === q);
    if (exacto) {
      asignar(exacto);
      return;
    }
    const lower = q.toLowerCase();
    const encontrados = products.filter((p) => p.name.toLowerCase().includes(lower));
    if (!encontrados.length) {
      setCoincidencias([]);
      setError(`No encontré ningún producto con "${q}"`);
      return;
    }
    if (encontrados.length === 1) {
      asignar(encontrados[0]);
      return;
    }
    setError(null);
    setCoincidencias(encontrados.slice(0, 8));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscar();
    }
  };

  return (
    <div className="page-grid">
      <div className="panel" style={{ padding: '1rem' }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>Cargar vencimientos</h3>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
          Elegí la fecha una sola vez. Después escaneá o buscá cada producto del lote: queda con esa
          fecha y se anota en el historial. Para otro lote, cambiá la fecha.
        </p>

        <div className="field">
          <label htmlFor="venc-fecha">Fecha de vencimiento del lote</label>
          <input
            id="venc-fecha"
            type="date"
            value={fecha}
            onChange={(e) => cambiarFecha(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="venc-producto">Producto (escaneá o buscá)</label>
          <input
            id="venc-producto"
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCoincidencias([]);
            }}
            onKeyDown={onKeyDown}
            placeholder="Código de barras, ID o nombre — Enter para asignar"
            autoComplete="off"
            disabled={busy}
          />
        </div>

        {coincidencias.length > 0 && (
          <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.75rem' }}>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              Varios productos coinciden, elegí uno:
            </span>
            {coincidencias.map((p) => (
              <button
                key={p.id}
                type="button"
                className="b"
                style={{ justifyContent: 'space-between', textAlign: 'left' }}
                disabled={busy}
                onClick={() => asignar(p)}
              >
                <span>{p.name}</span>
                <span className="muted">
                  {p.expires_on ? `vence ${formatearFecha(p.expires_on)}` : 'sin vencimiento'}
                </span>
              </button>
            ))}
          </div>
        )}

        {error && <div className="error">{error}</div>}
        {mensaje && !error && (
          <div className="muted" style={{ color: 'var(--ok)', fontWeight: 600 }}>
            ✓ {mensaje}
          </div>
        )}
      </div>

      <div className="panel" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--titulo)' }}>Historial de cargas</h3>
          <button type="button" className="b fantasma" onClick={cargarHistorial}>
            Actualizar
          </button>
        </div>
        <div className="t-wrap" style={{ marginTop: '0.75rem' }}>
          <table className="t">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Producto</th>
                <th>Vence</th>
                <th className="d">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id}>
                  <td className="muted">{horaCarga(l.created_at)}</td>
                  <td>{l.product_name}</td>
                  <td>{formatearFecha(l.expires_on)}</td>
                  <td className="d muted">{l.user_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!log.length && <div className="empty">Todavía no se cargó ningún vencimiento</div>}
      </div>
    </div>
  );
}
