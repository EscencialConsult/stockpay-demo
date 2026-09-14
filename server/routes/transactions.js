import { Router } from 'express';
import { getDb, mapTransaction } from '../db.js';
import { requirePerm } from '../auth.js';
import { CUENTA_CORRIENTE_PAYMENT_TYPE } from '../constants.js';

/**
 * Fiado: la venta no cobra nada en el momento, va al saldo del cliente.
 * Un solo lugar hace esto — tanto la venta nueva (`/new`) como la que se
 * retoma de "en espera" pasan por acá — para que el saldo nunca quede
 * desalineado con lo que la caja realmente fió.
 */
function registrarFiado(db, customerId, total, transactionId) {
  const id = parseInt(customerId, 10);
  if (!id || !total) return;
  db.prepare(
    `INSERT INTO account_movements (customer_id, type, amount, transaction_id, notes, date)
     VALUES (?, 'venta', ?, ?, '', ?)`
  ).run(id, total, transactionId, new Date().toISOString());
  db.prepare('UPDATE customers SET balance = balance + ? WHERE id = ?').run(total, id);
}

const router = Router();

/**
 * Antes de tocar nada, valida que cada producto que trackea stock (`stock`
 * es un flag "trackear sí/no", no la cantidad — ver server/routes/inventory.js)
 * tenga cantidad suficiente. Si alguno no alcanza, tira un error con
 * `.status = 409` ANTES de descontar nada — como esto corre siempre dentro
 * de db.transaction() (server/db.js), tirar acá revierte la venta completa
 * sola, nunca queda una venta con la mitad del carrito descontado.
 */
function decrementInventory(items, db) {
  // Agrupado por id ANTES de validar: la UI siempre fusiona un producto
  // repetido en una sola línea de carrito, pero la API no puede asumir eso.
  // Si dos líneas separadas pidieran el mismo producto, validar línea por
  // línea contra el mismo stock leído dos veces dejaría pasar una
  // sobreventa igual (ej. stock 3, dos líneas de 2 cada una: cada línea ve
  // "3 >= 2" y pasa, pero juntas piden 4).
  const qtyById = new Map();
  for (const item of items || []) {
    const id = parseInt(item.id ?? item._id, 10);
    const qty = parseInt(item.quantity, 10) || 0;
    if (!id || !qty) continue;
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
  }

  for (const [id, qty] of qtyById) {
    const product = db.prepare('SELECT id, name, quantity, stock FROM products WHERE id = ?').get(id);
    if (!product || product.stock === 0) continue;
    if ((product.quantity || 0) < qty) {
      const err = new Error(
        `Stock insuficiente para "${product.name}": quedan ${product.quantity || 0}, se pidieron ${qty}`
      );
      err.status = 409;
      throw err;
    }
  }

  for (const [id, qty] of qtyById) {
    const product = db.prepare('SELECT id, quantity, stock FROM products WHERE id = ?').get(id);
    if (!product || product.stock === 0) continue;
    db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(product.quantity - qty, id);
  }
}

router.get('/all', requirePerm('perm_transactions'), (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM transactions ORDER BY date DESC').all();
  res.json(rows.map(mapTransaction));
});

router.get('/on-hold', (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT * FROM transactions
       WHERE ref_number != '' AND status = 0
       ORDER BY date DESC`
    )
    .all();
  res.json(rows.map(mapTransaction));
});

router.get('/customer-orders', (_req, res) => {
  const rows = getDb()
    .prepare(
      `SELECT * FROM transactions
       WHERE customer != '0' AND status = 0 AND (ref_number IS NULL OR ref_number = '')
       ORDER BY date DESC`
    )
    .all();
  res.json(rows.map(mapTransaction));
});

router.get('/by-date', requirePerm('perm_transactions'), (req, res) => {
  const startDate = new Date(String(req.query.start || ''));
  const endDate = new Date(String(req.query.end || ''));
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return res.status(400).json({ error: 'Fecha de inicio o fin inválida' });
  }

  const start = startDate.toISOString();
  const end = endDate.toISOString();
  const statusRaw = parseInt(String(req.query.status), 10);
  const status = Number.isFinite(statusRaw) ? statusRaw : 1;
  const userId = parseInt(String(req.query.user), 10) || 0;
  const till = parseInt(String(req.query.till), 10) || 0;

  let sql = `SELECT * FROM transactions WHERE date >= ? AND date <= ? AND status = ?`;
  const params = [start, end, status];

  if (userId) {
    sql += ' AND user_id = ?';
    params.push(userId);
  }
  if (till) {
    sql += ' AND till = ?';
    params.push(till);
  }
  sql += ' ORDER BY date DESC';

  const rows = getDb().prepare(sql).all(...params);
  res.json(rows.map(mapTransaction));
});

router.post('/new', (req, res) => {
  const body = req.body || {};
  const items = body.items || [];
  const paid = parseFloat(body.paid) || 0;
  const total = parseFloat(body.total) || 0;
  const paymentType = parseInt(body.payment_type, 10) || 1;
  const customerId = String(body.customer ?? '0');
  const status = body.status === undefined ? 1 : parseInt(body.status, 10);

  const esCuentaCorriente = paymentType === CUENTA_CORRIENTE_PAYMENT_TYPE;

  if (esCuentaCorriente && status === 1 && customerId === '0') {
    return res.status(400).json({ error: 'La cuenta corriente necesita un cliente, no Consumidor final.' });
  }
  // En cuenta corriente, "paid" es lo que el cliente entrega AHORA (puede
  // ser 0 — fiado completo — o parcial): nunca puede ser más que el total,
  // porque si pagó todo no tiene sentido que la venta sea a cuenta.
  if (esCuentaCorriente && paid > total + 0.0001) {
    return res.status(400).json({ error: 'En cuenta corriente, lo que paga ahora no puede ser mayor al total.' });
  }

  const db = getDb();
  const insert = db.transaction(() => {
    const result = db
      .prepare(
        `INSERT INTO transactions (
          ref_number, customer, customer_name, status, user_id, user_name, till,
          discount, subtotal, tax, total, paid, change, payment_type, items_json, date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.ref_number || '',
        customerId,
        body.customer_name || '',
        status,
        parseInt(body.user_id, 10) || 0,
        body.user || body.user_name || '',
        parseInt(body.till, 10) || 1,
        parseFloat(body.discount) || 0,
        parseFloat(body.subtotal) || 0,
        parseFloat(body.tax) || 0,
        total,
        paid,
        parseFloat(body.change) || 0,
        paymentType,
        JSON.stringify(items),
        body.date || new Date().toISOString()
      );

    // Cuenta corriente no exige "paid >= total" como cualquier otro medio —
    // ahí el punto es justamente que puede quedar plata pendiente. Solo se
    // fía el resto (total - paid), nunca el total completo si ya entregó
    // algo ahora.
    const pagoAlcanza = esCuentaCorriente ? paid >= 0 : paid >= total;
    if (pagoAlcanza && status === 1) {
      decrementInventory(items, db);
      if (esCuentaCorriente) {
        const pendiente = Math.max(0, total - paid);
        if (pendiente > 0) {
          registrarFiado(db, customerId, pendiente, result.lastInsertRowid);
        }
      }
    }

    return result.lastInsertRowid;
  });

  const id = insert();
  res.json({ ok: true, id });
});

router.put('/new', (req, res) => {
  const body = req.body || {};
  const id = parseInt(body._id ?? body.id, 10);
  const items = body.items || [];
  const paid = parseFloat(body.paid) || 0;
  const total = parseFloat(body.total) || 0;
  const status = parseInt(body.status, 10) ?? 1;

  const db = getDb();
  const update = db.transaction(() => {
    const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id);
    db.prepare(
      `UPDATE transactions SET
        ref_number = ?, customer = ?, customer_name = ?, status = ?, user_id = ?, user_name = ?, till = ?,
        discount = ?, subtotal = ?, tax = ?, total = ?, paid = ?, change = ?, payment_type = ?, items_json = ?, date = ?
       WHERE id = ?`
    ).run(
      body.ref_number || '',
      String(body.customer ?? '0'),
      body.customer_name || '',
      status,
      parseInt(body.user_id, 10) || 0,
      body.user || body.user_name || '',
      parseInt(body.till, 10) || 1,
      parseFloat(body.discount) || 0,
      parseFloat(body.subtotal) || 0,
      parseFloat(body.tax) || 0,
      total,
      paid,
      parseFloat(body.change) || 0,
      parseInt(body.payment_type, 10) || 1,
      JSON.stringify(items),
      body.date || new Date().toISOString(),
      id
    );

    // Decrement stock when completing a previously unpaid/hold order
    if (existing && existing.status === 0 && status === 1 && paid >= total) {
      decrementInventory(items, db);
    }
  });

  update();
  res.sendStatus(200);
});

router.post('/delete', (req, res) => {
  const orderId = parseInt(req.body?.orderId ?? req.body?._id, 10);
  getDb().prepare('DELETE FROM transactions WHERE id = ?').run(orderId);
  res.sendStatus(200);
});

router.get('/transaction/:transactionId', (req, res) => {
  const row = getDb()
    .prepare('SELECT * FROM transactions WHERE id = ?')
    .get(parseInt(req.params.transactionId, 10));
  res.json(mapTransaction(row));
});

export default router;
