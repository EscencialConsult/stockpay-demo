import { Fragment, useEffect, useState } from 'react';
import { api, Closure, ClosureSummary } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Props = {
  symbol: string;
};

/**
 * Pantalla propia de cierre de caja — antes esta información solo existía
 * adentro de Caja, así que un administrador nunca la veía sin abrir una
 * venta. Muestra el período actual (todavía sin cerrar) con el desglose
 * por medio de pago, y el historial de cierres ya hechos, cada uno con su
 * propio desglose — mismo patrón que el arqueo de carnicerías.
 */
export default function ClosuresView({ symbol }: Props) {
  const { apiInfo } = useAuth();
  const till = apiInfo?.till || 1;
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [history, setHistory] = useState<Closure[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        api.getClosureSummary(till),
        api.getClosures(0),
      ]);
      setSummary(s);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el cierre de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div className="error">{error}</div>}

      <div className="panel" style={{ padding: '1.25rem' }}>
        <div className="p-cab">
          <h2>Período actual — Caja {till}</h2>
          <div className="der">
            <button type="button" className="b" onClick={load} disabled={loading}>
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>
        </div>
        {summary && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Ventas pagadas desde el {new Date(summary.periodStart).toLocaleString()}, todavía sin
              cerrar.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div className="kpi" style={{ flex: 1, minWidth: 160 }}>
                <div className="txt">
                  <div className="et">Ventas</div>
                  <div className="v">{summary.salesCount}</div>
                </div>
              </div>
              <div className="kpi" style={{ flex: 1, minWidth: 160 }}>
                <div className="txt">
                  <div className="et">Efectivo esperado</div>
                  <div className="v">
                    {symbol}
                    {summary.cashExpected.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="kpi" style={{ flex: 1, minWidth: 160 }}>
                <div className="txt">
                  <div className="et">Total del período</div>
                  <div className="v">
                    {symbol}
                    {summary.total.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
            <BreakdownTable breakdown={summary.breakdown} symbol={symbol} />
            {!summary.breakdown.length && (
              <div className="empty">Todavía no hay ventas en este período</div>
            )}
          </>
        )}
      </div>

      <div className="panel" style={{ padding: '1.25rem' }}>
        <div className="p-cab">
          <h2>Historial de cierres</h2>
        </div>
        <div className="t-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Caja</th>
                <th>Cerró</th>
                <th className="d">Ventas</th>
                <th className="d">Efectivo esperado</th>
                <th className="d">Efectivo contado</th>
                <th className="d">Diferencia</th>
                <th className="d">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((c) => (
                <Fragment key={c.id}>
                  <tr>
                    <td>{new Date(c.date).toLocaleString()}</td>
                    <td>{c.till}</td>
                    <td>{c.user}</td>
                    <td className="d">{c.sales_count}</td>
                    <td className="d">
                      {symbol}
                      {c.cash_expected.toFixed(2)}
                    </td>
                    <td className="d">
                      {symbol}
                      {c.cash_counted.toFixed(2)}
                    </td>
                    <td className="d">
                      <span className={`recuadro ${c.cash_difference < 0 ? 'bad' : c.cash_difference > 0 ? 'warn' : 'ok'}`}>
                        {symbol}
                        {Math.abs(c.cash_difference).toFixed(2)}
                      </span>
                    </td>
                    <td className="d">
                      {symbol}
                      {c.total_sales.toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="mini"
                        onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      >
                        {expanded === c.id ? 'Ocultar' : 'Ver detalle'}
                      </button>
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr>
                      <td colSpan={9} style={{ background: 'var(--surface-faint)' }}>
                        {c.notes && (
                          <p style={{ margin: '0 0 0.5rem' }}>
                            <strong>Notas:</strong> {c.notes}
                          </p>
                        )}
                        <BreakdownTable breakdown={c.breakdown} symbol={symbol} compact />
                        {!c.breakdown.length && <p className="muted">Sin desglose por medio de pago.</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {!history.length && <div className="empty">Todavía no se hizo ningún cierre</div>}
      </div>
    </div>
  );
}

function BreakdownTable({
  breakdown,
  symbol,
  compact,
}: {
  breakdown: { valor: number; etiqueta: string; count: number; total: number }[];
  symbol: string;
  compact?: boolean;
}) {
  if (!breakdown.length) return null;
  return (
    <div className="t-wrap">
      <table className="t" style={compact ? { fontSize: '0.85rem' } : undefined}>
        <thead>
          <tr>
            <th>Medio de pago</th>
            <th className="d">Operaciones</th>
            <th className="d">Total</th>
          </tr>
        </thead>
        <tbody>
          {breakdown.map((m) => (
            <tr key={m.valor}>
              <td>{m.etiqueta}</td>
              <td className="d">{m.count}</td>
              <td className="d">
                {symbol}
                {m.total.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
