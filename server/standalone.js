// Entrypoint para correr el backend de StockPay como servicio web normal,
// fuera de Electron — pensado para Docker (ver Dockerfile en la raíz).
//
// `createServer()` (server/index.js) ya es agnóstico de Electron: solo
// necesita rutas de disco y un secreto JWT. Acá le damos rutas fijas dentro
// del contenedor, montadas en un volumen para que los datos de la demo
// sobrevivan a un restart/redeploy del contenedor.
import path from 'path';
import { createServer } from './index.js';

const DATA_DIR = process.env.DATA_DIR || '/data';
const dbPath = path.join(DATA_DIR, 'pos.sqlite');
const uploadsPath = path.join(DATA_DIR, 'uploads');
const PORT = process.env.PORT || 8001;

const app = await createServer({
  dbPath,
  uploadsPath,
  jwtSecret: process.env.JWT_SECRET || 'stockpay-web-demo-dev-secret',
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`StockPay Web Demo API escuchando en :${PORT} (datos en ${DATA_DIR})`);
});
