import { Router } from 'express';
import { getDb, mapCustomer, mapAccountMovement } from '../db.js';
import { requirePerm } from '../auth.js';

const router = Router();

router.get('/all', (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM customers ORDER BY name').all();
  res.json(rows.map(mapCustomer));
});

router.get('/customer/:customerId', (req, res) => {
  const row = getDb()
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(parseInt(req.params.customerId, 10));
  res.json(mapCustomer(row));
});

router.post('/customer', (req, res) => {
  const body = req.body || {};
  getDb()
    .prepare(
      `INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)`
    )
    .run(body.name || '', body.phone || '', body.email || '', body.address || '');
  res.sendStatus(200);
});

router.put('/customer', (req, res) => {
  const body = req.body || {};
  const id = parseInt(body._id ?? body.id, 10);
  getDb()
    .prepare(
      `UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?`
    )
    .run(body.name || '', body.phone || '', body.email || '', body.address || '', id);
  res.sendStatus(200);
});

router.delete('/customer/:customerId', (req, res) => {
  getDb()
    .prepare('DELETE FROM customers WHERE id = ?')
    .run(parseInt(req.params.customerId, 10));
  res.sendStatus(200);
});

// ── Cuenta corriente (fiado) ────────────────────────────────────────────

router.get('/customer/:customerId/account', requirePerm('perm_transactions'), (req, res) => {
  const id = parseInt(req.params.customerId, 10);
  const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
  const movements = getDb()
    .prepare('SELECT * FROM account_movements WHERE customer_id = ? ORDER BY date DESC, id DESC')
    .all(id);
  res.json({ balance: customer.balance || 0, movements: movements.map(mapAccountMovement) });
});

router.post('/customer/:customerId/account/payment', requirePerm('perm_transactions'), (req, res) => {
  const id = parseInt(req.params.customerId, 10);
  const amount = parseFloat(req.body?.amount) || 0;
  if (!id || amount <= 0) {
    return res.status(400).json({ error: 'El importe del pago tiene que ser mayor que cero.' });
  }
  const customer = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });

  // Cobrarle a un cliente su cuenta corriente es plata real que entra a ESA
  // caja en ESE momento — till y payment_type son los mismos que usa una
  // venta común (server/routes/transactions.js), para que el cierre de caja
  // (server/routes/closures.js) lo cuente junto con el resto.
  const till = parseInt(req.body?.till, 10) || 1;
  const paymentType = parseInt(req.body?.payment_type, 10) || 1;

  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO account_movements (customer_id, type, amount, transaction_id, notes, date, till, user_id, payment_type)
       VALUES (?, 'pago', ?, NULL, ?, ?, ?, ?, ?)`
    ).run(
      id,
      amount,
      String(req.body?.notes || ''),
      new Date().toISOString(),
      till,
      parseInt(req.user?.id, 10) || 0,
      paymentType
    );
    db.prepare('UPDATE customers SET balance = balance - ? WHERE id = ?').run(amount, id);
  })();

  const updated = getDb().prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json(mapCustomer(updated));
});

export default router;
