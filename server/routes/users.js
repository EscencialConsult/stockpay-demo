import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getDb, mapUser } from '../db.js';
import {
  authenticate,
  requirePerm,
  loginUser,
  signToken,
  hashPassword,
} from '../auth.js';
import { isRole, permsForRole } from '../roles.js';

const router = Router();

const PERM_KEYS = ['perm_products', 'perm_categories', 'perm_transactions', 'perm_users', 'perm_settings'];

/**
 * Permisos por usuario, editables desde el formulario de Equipo — el rol
 * ya no los fija, solo es la plantilla que se usa acá cuando el body no
 * manda un permiso puntual (alta rápida, o un cliente viejo que todavía no
 * manda los switches). Body puede mandar cada perm_* como boolean, 1/0 o
 * '1'/'0' — mismo criterio laxo que ya usa settings.js para charge_tax.
 */
function resolvePerms(body, role) {
  const template = permsForRole(role);
  const out = {};
  for (const key of PERM_KEYS) {
    if (body[key] === undefined) {
      out[key] = template[key];
    } else {
      out[key] = body[key] === true || body[key] === 1 || body[key] === '1' ? 1 : 0;
    }
  }
  return out;
}

// El modo "Servidor de red" escucha en 0.0.0.0 — cualquiera en la misma LAN
// del comercio puede intentar fuerza bruta contra bcrypt sin este freno.
// 5 intentos cada 15 minutos por IP alcanza para un uso normal y frena un
// ataque automatizado sin necesitar ninguna cuenta ni servicio externo.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Esperá unos minutos antes de volver a intentar.' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }
  const user = loginUser(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
  const token = signToken(user);
  res.json({ user, token });
});

router.get('/check', (_req, res) => {
  const admin = getDb().prepare('SELECT id FROM users WHERE id = 1').get();
  res.json({ ready: !!admin });
});

router.use(authenticate);

router.get('/user/:userId', (req, res) => {
  const row = getDb()
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(parseInt(req.params.userId, 10));
  res.json(mapUser(row));
});

router.get('/logout/:userId', (req, res) => {
  getDb()
    .prepare('UPDATE users SET status = ? WHERE id = ?')
    .run(`Logged Out_${new Date().toISOString()}`, parseInt(req.params.userId, 10));
  res.sendStatus(200);
});

router.get('/all', requirePerm('perm_users'), (_req, res) => {
  const rows = getDb().prepare('SELECT * FROM users ORDER BY id').all();
  res.json(rows.map(mapUser));
});

router.delete(
  '/user/:userId',
  requirePerm('perm_users'),
  (req, res) => {
    const id = parseInt(req.params.userId, 10);
    if (id === 1) {
      return res.status(400).json({ error: 'No se puede eliminar al administrador por defecto' });
    }
    getDb().prepare('DELETE FROM users WHERE id = ?').run(id);
    res.sendStatus(200);
  }
);

router.post('/post', requirePerm('perm_users'), (req, res) => {
  const body = req.body || {};
  const role = isRole(body.role) ? body.role : 'cajero';

  if (!body.id) {
    const perms = resolvePerms(body, role);
    const result = getDb()
      .prepare(
        `INSERT INTO users (
          username, password, fullname, role,
          perm_products, perm_categories, perm_transactions, perm_users, perm_settings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.username,
        hashPassword(body.password || 'password'),
        body.fullname || '',
        role,
        perms.perm_products,
        perms.perm_categories,
        perms.perm_transactions,
        perms.perm_users,
        perms.perm_settings
      );
    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    return res.json(mapUser(row));
  }

  const id = parseInt(body.id, 10);
  // El administrador por defecto (id 1) siempre queda 'administrador' y con
  // los 5 permisos activos: es la cuenta de recuperación y no puede quedar
  // sin acceso por un error de carga.
  const finalRole = id === 1 ? 'administrador' : role;
  const perms = id === 1 ? { perm_products: 1, perm_categories: 1, perm_transactions: 1, perm_users: 1, perm_settings: 1 } : resolvePerms(body, finalRole);

  if (body.password) {
    getDb()
      .prepare(
        `UPDATE users SET username = ?, password = ?, fullname = ?, role = ?,
          perm_products = ?, perm_categories = ?, perm_transactions = ?, perm_users = ?, perm_settings = ?
         WHERE id = ?`
      )
      .run(
        body.username,
        hashPassword(body.password),
        body.fullname || '',
        finalRole,
        perms.perm_products,
        perms.perm_categories,
        perms.perm_transactions,
        perms.perm_users,
        perms.perm_settings,
        id
      );
  } else {
    getDb()
      .prepare(
        `UPDATE users SET username = ?, fullname = ?, role = ?,
          perm_products = ?, perm_categories = ?, perm_transactions = ?, perm_users = ?, perm_settings = ?
         WHERE id = ?`
      )
      .run(
        body.username,
        body.fullname || '',
        finalRole,
        perms.perm_products,
        perms.perm_categories,
        perms.perm_transactions,
        perms.perm_users,
        perms.perm_settings,
        id
      );
  }
  res.sendStatus(200);
});

export default router;
