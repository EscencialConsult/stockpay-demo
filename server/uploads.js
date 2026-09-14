import path from 'path';

/**
 * Resuelve un nombre de archivo dentro de `uploadsPath`, sin dejarlo escapar
 * de esa carpeta. `filename` puede venir tal cual del cliente (ej. el `img`
 * que se manda al reemplazar una foto) — sin este chequeo, un valor como
 * `../../otra-carpeta/archivo` haría que `path.join` arme una ruta fuera de
 * uploads, y un `unlinkSync` sobre eso borraría un archivo cualquiera del
 * disco. Devuelve `null` si el resultado no queda adentro.
 */
export function safeUploadPath(uploadsPath, filename) {
  if (!filename) return null;
  const base = path.resolve(uploadsPath);
  const resolved = path.resolve(base, filename);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}
