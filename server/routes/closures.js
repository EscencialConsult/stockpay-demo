import { Router } from 'express';
import { getDb, mapClosure } from '../db.js';
import { requirePerm } from '../auth.js';
import { MEDIOS_DE_PAGO, CUENTA_CORRIENTE_PAYMENT_TYPE } from '../constants.js';

const router = Router();

/**
 * Ventas pagadas de un `till` entre `start` y `end`, agrupadas por medio de
 * pago. Es el único lugar que calcula "cuánto debería haber" — tanto el
 * resumen previo al cierre como el cierre mismo pasan por acá, así nunca
 * quedan desalineados.
 *
 * El desglose por medio (efectivo, débito, transferencia/QR, crédito,
 * cheque, cuenta corriente) es lo que pidió Facundo después de ver que el
 * cierre solo mostraba "efectivo" vs. "todo lo demás junto" — ahora cada
 * medio aparece con su propio total, igual que el arqueo de carnicerías.
 */
function summarize(till, start, end) {
  const rows = getDb()
    .prepare(
      `SELECT payment_type, paid FROM transactions
       WHERE till = ? AND status = 1 AND date > ? AND date <= ?`
    )
    .all(till, start, end);

  // Cobrar una cuenta corriente (fiado) es plata real entrando a la caja en
  // ese momento — tiene que sumar al cierre igual que una venta común, con
  // el medio de pago que se eligió al cobrar (server/routes/customers.js).
  // Antes esto NO se contaba acá: el cajero podía cobrar una deuda en
  // efectivo y esa plata nunca aparecía en el arqueo del día.
  const pagos = getDb()
    .prepare(
      `SELECT payment_type, amount AS paid FROM account_movements
       WHERE type = 'pago' AND till = ? AND date > ? AND date <= ?`
    )
    .all(till, start, end);

  const porMedio = new Map(MEDIOS_DE_PAGO.map((m) => [m.valor, { ...m, count: 0, total: 0 }]));
  let cashTotal = 0;
  let cardTotal = 0;
  for (const r of [...rows, ...pagos]) {
    // Una venta a cuenta corriente con pago parcial ("paid" > 0, el resto
    // queda fiado) entrega esa parte en efectivo en el momento — es plata
    // física en el cajón, igual que cobrar una cuenta vieja. Si "paid" es 0
    // (fiado completo), no aporta nada a ningún total, como siempre.
    const esParcialDeCuentaCorriente = r.payment_type === CUENTA_CORRIENTE_PAYMENT_TYPE && r.paid > 0;
    const medioEfectivo = esParcialDeCuentaCorriente ? 1 : r.payment_type;

    const medio = porMedio.get(medioEfectivo);
    if (medio && r.paid > 0) {
      medio.count += 1;
      medio.total += r.paid;
    }
    // 1 = efectivo (ver src/config/pagos.ts); todo lo demás (débito,
    // transferencia, crédito, cheque) no es plata física en el cajón, así
    // que entra en el mismo total "no efectivo".
    if (medioEfectivo === 1) cashTotal += r.paid;
    else cardTotal += r.paid;
  }
  const breakdown = MEDIOS_DE_PAGO.map((m) => porMedio.get(m.valor)).filter((m) => m.count > 0);

  return {
    salesCount: rows.length + pagos.length,
    cashExpected: cashTotal,
    cardTotal,
    total: cashTotal + cardTotal,
    breakdown,
  };
}

/** Arranque del período: fin del último cierre de ese till, o el inicio de hoy si nunca se cerró. */
function periodStart(till) {
  const last = getDb()
    .prepare('SELECT period_end FROM till_closures WHERE till = ? ORDER BY id DESC LIMIT 1')
    .get(till);
  if (last) return last.period_end;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

router.get('/summary', requirePerm('perm_transactions'), (req, res) => {
  const till = parseInt(String(req.query.till), 10) || 1;
  const start = periodStart(till);
  const end = new Date().toISOString();
  const summary = summarize(till, start, end);
  res.json({ till, periodStart: start, periodEnd: end, ...summary });
});

router.get('/', requirePerm('perm_transactions'), (req, res) => {
  const till = parseInt(String(req.query.till), 10) || 0;
  let sql = 'SELECT * FROM till_closures';
  const params = [];
  if (till) {
    sql += ' WHERE till = ?';
    params.push(till);
  }
  sql += ' ORDER BY id DESC LIMIT 50';
  const rows = getDb().prepare(sql).all(...params);
  res.json(rows.map(mapClosure));
});

router.post('/', requirePerm('perm_transactions'), (req, res) => {
  const body = req.body || {};
  const till = parseInt(body.till, 10) || 1;
  const cashCounted = parseFloat(body.cashCounted) || 0;
  const notes = String(body.notes || '');

  const start = periodStart(till);
  const end = new Date().toISOString();
  const summary = summarize(till, start, end);
  const difference = cashCounted - summary.cashExpected;

  const result = getDb()
    .prepare(
      `INSERT INTO till_closures (
        till, user_id, user_name, period_start, period_end, sales_count,
        cash_expected, cash_counted, cash_difference, card_total, total_sales, notes, created_at, breakdown_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      till,
      parseInt(req.user?.id, 10) || 0,
      req.user?.username || '',
      start,
      end,
      summary.salesCount,
      summary.cashExpected,
      cashCounted,
      difference,
      summary.cardTotal,
      summary.total,
      notes,
      end,
      JSON.stringify(summary.breakdown)
    );

  const row = getDb().prepare('SELECT * FROM till_closures WHERE id = ?').get(result.lastInsertRowid);
  res.json(mapClosure(row));
});

export default router;
