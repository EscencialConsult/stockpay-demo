#!/usr/bin/env node
// Regenera todos los tamaños de ícono (build/icon-*.png, build/icon.ico,
// public/favicon.ico) a partir de UNA sola imagen fuente — el logo del
// cliente. Reemplaza el ícono ONE por completo; correr esto es el único
// paso necesario para el logo (después hay que recompilar el instalador).
//
// Uso:
//   node scripts/set-brand-icon.mjs "C:\ruta\al\logo-cliente.png"
//
// La imagen fuente debe ser cuadrada (o se recorta al cuadrado más grande
// que entre), con fondo transparente si el logo no lo tiene ya de por sí,
// y de al menos 256x256 — 500x500 o más da mejor resultado.

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error('Uso: node scripts/set-brand-icon.mjs <ruta-al-logo.png>');
  process.exit(1);
}
if (!fs.existsSync(sourcePath)) {
  console.error(`No existe el archivo: ${sourcePath}`);
  process.exit(1);
}

const SIZES = [16, 32, 48, 64, 128, 256];

async function main() {
  const buildDir = path.join(root, 'build');
  fs.mkdirSync(buildDir, { recursive: true });

  const source = sharp(sourcePath).ensureAlpha();
  const pngBuffers = [];

  for (const size of SIZES) {
    const buf = await sharp(sourcePath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    fs.writeFileSync(path.join(buildDir, `icon-${size}.png`), buf);
    pngBuffers.push(buf);
    console.log(`  icon-${size}.png`);
  }

  // El .png "principal" (para Linux/tray) es el más grande.
  fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[pngBuffers.length - 1]);

  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);
  fs.writeFileSync(path.join(root, 'public', 'favicon.ico'), icoBuffer);
  console.log('  icon.ico');
  console.log('  favicon.ico');

  // Copia adentro de public/ para que la propia interfaz (barra lateral
  // cuando el negocio todavía no cargó su logo, pantalla de login) lo use
  // como <img>, sin pasar por Electron ni por el ícono del sistema — un
  // archivo con URL estable (`/logo.png`) que Vite sirve tal cual.
  fs.writeFileSync(path.join(root, 'public', 'logo.png'), pngBuffers[pngBuffers.length - 1]);
  console.log('  logo.png (public/, para la interfaz)');

  await source.metadata();
  console.log('\nListo. Falta: volver a compilar el instalador (npm run dist) para que el .exe lleve el ícono nuevo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
