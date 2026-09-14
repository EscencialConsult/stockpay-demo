import { useEffect, useState } from 'react';
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

  const body = (
    <>
      {error && <div className="error">{error}</div>}
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
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && !loading && <div className="empty">No hay ventas en este rango</div>}
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
