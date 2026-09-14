// Servidor de actualizaciones para esta etapa de desarrollo: sirve la
// carpeta `release/` (donde `npm run dist` deja el instalador + `latest.yml`)
// por HTTP en la misma compu, para que `electron-updater` (apuntado a
// `http://127.0.0.1:8899` en package.json → build.publish) pueda revisar si
// hay una versión más nueva que la instalada.
//
// Flujo para "publicar" una actualización:
//   1. Subir la versión en package.json (ej. 2.0.0 -> 2.0.1)
//   2. npm run dist        (genera el instalador nuevo + latest.yml en release/)
//   3. npm run serve-updates   (deja este servidor corriendo)
//   4. Abrir la app YA INSTALADA (la vieja) — al arrancar va a detectar la
//      nueva versión sola y avisar.
//
// Cuando se decida el hosting final (servidor propio o GitHub Releases
// público), este script se reemplaza y solo hay que cambiar la URL en
// package.json → build.publish[0].url. El resto del código no cambia.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const releaseDir = path.join(__dirname, '..', 'release');
const PORT = 8899;

const MIME = {
  '.yml': 'text/yaml',
  '.exe': 'application/octet-stream',
  '.blockmap': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const filePath = path.join(releaseDir, urlPath);

  // No servir nada fuera de release/.
  if (!filePath.startsWith(releaseDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (!fs.existsSync(releaseDir)) {
  console.error(`No existe ${releaseDir} — corré "npm run dist" primero.`);
  process.exit(1);
}

server.listen(PORT, () => {
  console.log(`Servidor de actualizaciones en http://127.0.0.1:${PORT} (sirviendo ${releaseDir})`);
  console.log('Dejalo corriendo mientras probás la actualización. Ctrl+C para cortar.');
});
