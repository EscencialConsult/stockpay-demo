import { Fragment, useEffect, useMemo, useState } from 'react';
import { api, Transaction, User } from '../api/client';
import Modal from './Modal';
import Selector from './Selector';
import { sanitizeInteger } from '../lib/numericInput';

type Props = {
  open?: boolean;
  embedded?: boolean;
  onClose: () => void;
  users?: User[];
  symbol: string;
};

/** Format a Date for <input type="datetime-local"> in local time. */
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Parse datetime-local value as local time → ISO UTC for the API. */
function localInputToIso(value: string, endOfMinute = false) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  if (endOfMinute) d.setSeconds(59, 999);
  return d.toISOString();
}

function defaultRange() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 0, 0);
  return { start: toLocalInputValue(start), end: toLocalInputValue(end) };
}

type RankingProducto = { nombre: string; cantidad: number; total: number };

export default function TransactionsModal({
  open = true,
  embedded = false,
  onClose,
  symbol,
}: Props) {
  const initial = defaultRange();
  const [rows, setRows] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [userId, setUserId] = useState(0);
  const [till, setTill] = useState(0);
  const [status, setStatus] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'historial' | 'masVendidos'>('historial');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [list, allUsers] = await Promise.all([
        api.getByDate({
          start: localInputToIso(start),
          end: localInputToIso(end, true),
          user: userId,
          till,
          status,
        }),
        api.getUsers().catch(() => [] as User[]),
      ]);
      setRows(list);
      setUsers(allUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open || embedded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on open; Filter button refreshes
  }, [open, embedded]);

  // Se agrupa por NOMBRE de producto, no por id: un producto puede borrarse
  // del catálogo con el tiempo, pero el nombre es lo que la persona que lee
  // el reporte reconoce. Si dos productos distintos llegaran a tener el
  // mismo nombre exacto, el reporte los suma juntos — decisión aceptada.
  const masVendidos = useMemo<RankingProducto[]>(() => {
    const mapa = new Map<string, RankingProducto>();
    for (const r of rows) {
      for (const it of r.items || []) {
        const actual = mapa.get(it.name) || { nombre: it.name, cantidad: 0, total: 0 };
        actual.cantidad += it.quantity;
        actual.total += it.price * it.quantity;
        mapa.set(it.name, actual);
      }
    }
    return [...mapa.values()].sort((a, b) => b.cantidad - a.cantidad);
  }, [rows]);

  const top10 = masVendidos.slice(0, 10);
  const maxCantidad = top10[0]?.cantidad || 1;

  const body = (
    <>
      {error && <div className="error">{error}</div>}
      <div className="tabs" style={{ border: 0, borderRadius: 'var(--rad)', marginBottom: '1rem' }}>
        <button
          type="button"
          className={`tab ${tab === 'historial' ? 'act' : ''}`}
          onClick={() => setTab('historial')}
        >
          Historial
        </button>
        <button
          type="button"
          className={`tab ${tab === 'masVendidos' ? 'act' : ''}`}
          onClick={() => setTab('masVendidos')}
        >
          Más vendidos
        </button>
      </div>
      <div className="filters">
        <div className="field">
          <label>Desde</label>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="field">
          <label>Hasta</label>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="field">
          <label>Cajero</label>
          <Selector
            value={String(userId)}
            onChange={(v) => setUserId(Number(v))}
            options={[
              { value: '0', label: 'Todos' },
              ...users.map((u) => ({ value: String(u.id), label: u.fullname })),
            ]}
          />
        </div>
        <div className="field">
          <label>Caja</label>
          <input
            value={till || ''}
            onChange={(e) => setTill(Number(sanitizeInteger(e.target.value)) || 0)}
            inputMode="numeric"
            placeholder="0 = todas"
          />
        </div>
        <div className="field">
          <label>Estado</label>
          <Selector
            value={String(status)}
            onChange={(v) => setStatus(Number(v))}
            options={[
              { value: '1', label: 'Pagada' },
              { value: '0', label: 'Sin pagar / en espera' },
            ]}
          />
        </div>
        <button className="b pri" type="button" onClick={load} disabled={loading}>
          {loading ? 'Cargando…' : 'Filtrar'}
        </button>
      </div>

      {tab === 'historial' && (
        <>
          <div className="t-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Cajero</th>
                  <th>Caja</th>
                  <th>Cliente</th>
                  <th className="d">Total</th>
                  <th className="d">Pagado</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td className="cod">{r.id}</td>
                      <td>{new Date(r.date).toLocaleString()}</td>
                      <td>{r.user}</td>
                      <td>{r.till}</td>
                      <td>{r.customer_name}</td>
                      <td className="d">
                        {symbol}
                        {Number(r.total).toFixed(2)}
                      </td>
                      <td className="d">
                        {symbol}
                        {Number(r.paid).toFixed(2)}
                      </td>
                      <td>
                        <span className={`recuadro ${r.status === 1 ? 'ok' : 'gris'}`}>
                          {r.status === 1 ? 'Pagada' : 'Abierta'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="mini"
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                        >
                          {expandedId === r.id ? 'Ocultar' : 'Ver detalle'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === r.id && (
                      <tr>
                        <td colSpan={9} style={{ background: 'var(--surface-faint)' }}>
                          {r.items?.length ? (
                            <div className="t-wrap">
                              <table className="t" style={{ fontSize: '0.85rem' }}>
                                <thead>
                                  <tr>
                                    <th>Producto</th>
                                    <th className="d">Cantidad</th>
                                    <th className="d">Precio unitario</th>
                                    <th className="d">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {r.items.map((it, i) => (
                                    <tr key={i}>
                                      <td>{it.name}</td>
                                      <td className="d">{it.quantity}</td>
                                      <td className="d">
                                        {symbol}
                                        {it.price.toFixed(2)}
                                      </td>
                                      <td className="d">
                                        {symbol}
                                        {(it.price * it.quantity).toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="muted">Sin detalle de productos para esta venta.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && !loading && <div className="empty">No hay ventas en este rango</div>}
        </>
      )}

      {tab === 'masVendidos' && (
        <>
          {top10.length > 0 && (
            <div className="panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
              <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>Cantidad vendida</h3>
              {top10.map((p) => (
                <div
                  key={p.nombre}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}
                >
                  <span style={{ width: 160, flexShrink: 0 }}>{p.nombre}</span>
                  <div
                    style={{
                      flex: 1,
                      background: 'var(--panel-2)',
                      borderRadius: 'var(--rad)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      title={`${p.cantidad} unidades · ${symbol}${p.total.toFixed(2)} facturado`}
                      style={{
                        width: `${(p.cantidad / maxCantidad) * 100}%`,
                        background: 'var(--accent)',
                        borderRadius: 'var(--rad)',
                        height: '1.5rem',
                      }}
                    />
                  </div>
                  <strong style={{ width: 48, textAlign: 'right', flexShrink: 0 }}>{p.cantidad}</strong>
                </div>
              ))}
            </div>
          )}
          <div className="t-wrap">
            <table className="t">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="d">Cantidad vendida</th>
                  <th className="d">Total facturado</th>
                </tr>
              </thead>
              <tbody>
                {masVendidos.map((p) => (
                  <tr key={p.nombre}>
                    <td>{p.nombre}</td>
                    <td className="d">{p.cantidad}</td>
                    <td className="d">
                      {symbol}
                      {p.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!masVendidos.length && !loading && <div className="empty">No hay ventas en este rango</div>}
        </>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="panel" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <strong style={{ fontFamily: 'var(--titulo)' }}>Ventas</strong>
          <button className="b" type="button" onClick={onClose}>
            Volver a la caja
          </button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <Modal title="Ventas" open={open} onClose={onClose} wide>
      {body}
    </Modal>
  );
}
