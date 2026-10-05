import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { getDb, getFeatures, mapProduct, mapExpiryLog } from '../db.js';
import { requirePerm } from '../auth.js';
import { generateEan13 } from '../barcode.js';
import { safeUploadPath } from '../uploads.js';

/** Valida una fecha AAAA-MM-DD. Devuelve '' (sin vencimiento), la fecha
 * normalizada, o null si no es una fecha real. La comprobación de ida y
 * vuelta rechaza cosas como 2026-02-30, que JS acepta sin quejarse. */
function cleanExpiry(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
  return s;
}

/** Registra una carga de vencimiento en el historial. Se llama desde cada
 * ruta que cambia la fecha, así el historial nunca queda desfasado. */
function logExpiry(db, productId, productName, expiresOn, userName) {
  db.prepare(
    `INSERT INTO expiry_log (product_id, product_name, expires_on, user_name, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(productId, productName, expiresOn, userName || '', new Date().toISOString());
}

export default function inventoryRouter(uploadsPath) {
  const router = Router();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsPath),
    filename: (_req, _file, cb) => cb(null, `${Date.now()}.jpg`),
  });
  const upload = multer({ storage });

  router.get('/products', (_req, res) => {
    const rows = getDb().prepare('SELECT * FROM products ORDER BY name').all();
    res.json(rows.map(mapProduct));
  });

  router.get('/product/:productId', (req, res) => {
    const row = getDb()
      .prepare('SELECT * FROM products WHERE id = ?')
      .get(parseInt(req.params.productId, 10));
    res.json(mapProduct(row));
  });

  router.post('/product/sku', (req, res) => {
    const sku = String(req.body?.skuCode || '');
    const row = getDb()
      .prepare('SELECT * FROM products WHERE code = ? OR id = ? OR name = ?')
      .get(sku, parseInt(sku, 10) || -1, sku);
    res.json(mapProduct(row));
  });

  router.post(
    '/product',
    requirePerm('perm_products'),
    upload.single('imagename'),
    (req, res) => {
      const body = req.body || {};
      const features = getFeatures();
      const current = body.id
        ? getDb().prepare('SELECT * FROM products WHERE id = ?').get(parseInt(body.id, 10))
        : null;

      // Imágenes apagadas: no se suben ni se quitan fotos. La que ya tenía el
      // producto queda tal cual, y el archivo recién subido se descarta.
      let image = body.img || '';
      if (!features.images) {
        image = current?.img || '';
        if (req.file) fs.unlink(req.file.path, () => {});
      } else if (req.file) {
        image = req.file.filename;
      }

      if (features.images && String(body.remove) === '1' && body.img) {
        const oldPath = safeUploadPath(uploadsPath, body.img);
        try {
          if (oldPath && fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        } catch (err) {
          console.error(err);
        }
        if (!req.file) image = '';
      }

      // Stock apagado: cantidad y control de inventario quedan como estaban.
      const stock = !features.stock
        ? current?.stock ?? 1
        : body.stock === 'on' || body.stock === 0 || body.stock === '0' ? 0 : 1;
      const quantity = !features.stock
        ? current?.quantity ?? 0
        : body.quantity === '' || body.quantity == null ? 0 : parseInt(body.quantity, 10);
      const typedCode = String(body.code || '').trim();

      // Vencimientos apagados: la fecha guardada no se toca y no se registra en el historial.
      let expiresOn = current?.expires_on || '';
      if (features.expiry && body.expires_on !== undefined) {
        const limpia = cleanExpiry(body.expires_on);
        if (limpia === null) {
          return res.status(400).json({ error: 'La fecha de vencimiento no es válida' });
        }
        expiresOn = limpia;
      }

      if (!body.id) {
        const db = getDb();
        const result = db
          .prepare(
            `INSERT INTO products (name, price, category, quantity, stock, img, code, expires_on)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            body.name,
            parseFloat(body.price) || 0,
            body.category || '',
            quantity,
            stock,
            image,
            typedCode,
            expiresOn
          );
        const id = result.lastInsertRowid;
        // Sin código propio (ni escaneado ni tipeado): se genera uno interno
        // ahora que ya existe el id, para que quede único siempre.
        if (!typedCode) {
          db.prepare('UPDATE products SET code = ? WHERE id = ?').run(generateEan13(id), id);
        }
        if (expiresOn) logExpiry(db, id, body.name, expiresOn, req.user?.username);
        const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        return res.json(mapProduct(row));
      }

      const id = parseInt(body.id, 10);
      const finalCode = typedCode || generateEan13(id);
      const db = getDb();
      db.prepare(
        `UPDATE products SET name = ?, price = ?, category = ?, quantity = ?, stock = ?, img = ?, code = ?, expires_on = ?
         WHERE id = ?`
      ).run(
        body.name,
        parseFloat(body.price) || 0,
        body.category || '',
        quantity,
        stock,
        image,
        finalCode,
        expiresOn,
        id
      );
      if (expiresOn && expiresOn !== (current?.expires_on || '')) {
        logExpiry(db, id, body.name, expiresOn, req.user?.username);
      }
      res.sendStatus(200);
    }
  );

  // Asigna (o cambia) el vencimiento de UN producto. Es el camino del panel
  // de carga: se escanea o busca cada producto con la misma fecha, y cada
  // asignación queda en expiry_log.
  router.post('/product/expiry', requirePerm('perm_products'), (req, res) => {
    if (!getFeatures().expiry) {
      return res.status(403).json({ error: 'La gestión de vencimientos está desactivada en Configuración' });
    }
    const id = parseInt(req.body?.productId, 10);
    const expiresOn = cleanExpiry(req.body?.expires_on);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Falta el producto' });
    }
    if (!expiresOn) {
      return res.status(400).json({ error: 'Elegí una fecha de vencimiento válida' });
    }
    const db = getDb();
    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    db.prepare('UPDATE products SET expires_on = ? WHERE id = ?').run(expiresOn, id);
    logExpiry(db, id, product.name, expiresOn, req.user?.username);
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json(mapProduct(row));
  });

  router.get('/expiry-log', (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
    const rows = getDb()
      .prepare('SELECT * FROM expiry_log ORDER BY id DESC LIMIT ?')
      .all(limit);
    res.json(rows.map(mapExpiryLog));
  });

  router.delete('/product/:productId', requirePerm('perm_products'), (req, res) => {
    const id = parseInt(req.params.productId, 10);
    const row = getDb().prepare('SELECT img FROM products WHERE id = ?').get(id);
    getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
    if (row?.img) {
      const imgPath = safeUploadPath(uploadsPath, row.img);
      try {
        if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      } catch (err) {
        console.error(err);
      }
    }
    res.sendStatus(200);
  });

  router.post('/products/bulk-delete', requirePerm('perm_products'), (req, res) => {
    const ids = (req.body?.ids || [])
      .map((id) => parseInt(id, 10))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) {
      return res.status(400).json({ error: 'No se enviaron IDs de producto' });
    }

    const db = getDb();
    let deleted = 0;
    db.transaction(() => {
      const getImg = db.prepare('SELECT img FROM products WHERE id = ?');
      const del = db.prepare('DELETE FROM products WHERE id = ?');
      for (const id of ids) {
        const row = getImg.get(id);
        const result = del.run(id);
        if (result.changes) deleted += 1;
        if (row?.img) {
          const imgPath = safeUploadPath(uploadsPath, row.img);
          try {
            if (imgPath && fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
          } catch (err) {
            console.error(err);
          }
        }
      }
    })();

    res.json({ ok: true, deleted });
  });

  return router;
}
