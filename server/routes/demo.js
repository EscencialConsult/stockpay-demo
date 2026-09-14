import { Router } from 'express';
import { getDb } from '../db.js';
import { requireAnyPerm } from '../auth.js';
import { WALK_IN_CUSTOMER } from '../constants.js';

const router = Router();

const DEMO_CATEGORIES = ['Bebidas', 'Snacks', 'Lácteos', 'Panadería', 'Limpieza'];

const DEMO_PRODUCTS = [
  { name: 'Coca-Cola 500ml', price: 18.99, category: 'Bebidas', quantity: 48 },
  { name: 'Sprite 500ml', price: 17.99, category: 'Bebidas', quantity: 36 },
  { name: 'Agua sin gas 500ml', price: 12.5, category: 'Bebidas', quantity: 60 },
  { name: 'Papas fritas 120g', price: 19.99, category: 'Snacks', quantity: 40 },
  { name: 'Palitos salados 55g', price: 9.99, category: 'Snacks', quantity: 50 },
  { name: 'Barra de chocolate', price: 14.5, category: 'Snacks', quantity: 45 },
  { name: 'Leche 1L', price: 28.99, category: 'Lácteos', quantity: 24 },
  { name: 'Docena de huevos', price: 42.0, category: 'Lácteos', quantity: 20 },
  { name: 'Queso cremoso 250g', price: 49.99, category: 'Lácteos', quantity: 15 },
  { name: 'Pan francés (kg)', price: 17.99, category: 'Panadería', quantity: 30 },
  { name: 'Pan integral (kg)', price: 19.99, category: 'Panadería', quantity: 24 },
  { name: 'Facturas (unidad)', price: 8.5, category: 'Panadería', quantity: 40 },
  { name: 'Detergente 750ml', price: 34.99, category: 'Limpieza', quantity: 18 },
  { name: 'Jabón de tocador', price: 15.5, category: 'Limpieza', quantity: 32 },
  { name: 'Papel higiénico x9', price: 79.99, category: 'Limpieza', quantity: 12 },
];

const DEMO_CUSTOMERS = [
  { name: 'Martín Gómez', phone: '11 5555-0101', email: 'martin@ejemplo.com', address: 'Buenos Aires' },
  { name: 'Sofía Ramírez', phone: '11 5555-0202', email: 'sofia@ejemplo.com', address: 'Córdoba' },
  { name: 'Lucas Fernández', phone: '11 5555-0303', email: 'lucas@ejemplo.com', address: 'Rosario' },
];

router.post('/seed', requireAnyPerm('perm_products', 'perm_settings'), (_req, res) => {
  const db = getDb();

  const result = db.transaction(() => {
    let categoriesAdded = 0;
    let productsAdded = 0;
    let customersAdded = 0;

    for (const name of DEMO_CATEGORIES) {
      const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
      if (!existing) {
        db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
        categoriesAdded += 1;
      }
    }

    const insertProduct = db.prepare(
      `INSERT INTO products (name, price, category, quantity, stock, img)
       VALUES (?, ?, ?, ?, 1, '')`
    );
    for (const p of DEMO_PRODUCTS) {
      const existing = db.prepare('SELECT id FROM products WHERE name = ?').get(p.name);
      if (!existing) {
        insertProduct.run(p.name, p.price, p.category, p.quantity);
        productsAdded += 1;
      }
    }

    const insertCustomer = db.prepare(
      `INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)`
    );
    for (const c of DEMO_CUSTOMERS) {
      const existing = db.prepare('SELECT id FROM customers WHERE name = ?').get(c.name);
      if (!existing) {
        insertCustomer.run(c.name, c.phone, c.email, c.address);
        customersAdded += 1;
      }
    }

    return { categoriesAdded, productsAdded, customersAdded };
  })();

  res.json({
    ok: true,
    ...result,
    message: `Se agregaron ${result.productsAdded} productos, ${result.categoriesAdded} categorías y ${result.customersAdded} clientes`,
  });
});

router.post('/clear', requireAnyPerm('perm_products', 'perm_settings'), (req, res) => {
  const body = req.body || {};
  const clearProducts = body.products !== false;
  const clearCategories = body.categories !== false;
  const clearCustomers = body.customers !== false;
  const clearTransactions = body.transactions !== false;

  const db = getDb();
  const counts = db.transaction(() => {
    const out = {
      products: 0,
      categories: 0,
      customers: 0,
      transactions: 0,
    };

    if (clearTransactions) {
      const r = db.prepare('DELETE FROM transactions').run();
      out.transactions = r.changes || 0;
    }
    if (clearProducts) {
      const r = db.prepare('DELETE FROM products').run();
      out.products = r.changes || 0;
    }
    if (clearCategories) {
      const r = db.prepare('DELETE FROM categories').run();
      out.categories = r.changes || 0;
    }
    if (clearCustomers) {
      const r = db
        .prepare('DELETE FROM customers WHERE name != ?')
        .run(WALK_IN_CUSTOMER);
      out.customers = r.changes || 0;
    }

    return out;
  })();

  // El wrapper de sql.js puede no exponer `changes` de forma confiable — si
  // hace falta, se puede recontar antes de borrar.
  res.json({
    ok: true,
    deleted: counts,
    message: 'Catálogo y datos de ejemplo relacionados eliminados',
  });
});

export default router;
