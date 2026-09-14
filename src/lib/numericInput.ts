/**
 * Saneadores para campos numéricos escritos a mano en un `<input type="text">`
 * en vez de `type="number"`.
 *
 * POR QUÉ NO `type="number"`: el navegador le roba ↑ y ↓ al campo para su
 * flechita nativa de sumar/restar — así es como debería ser mientras se
 * está escribiendo un importe (ver `flechasEnLaPantalla`), pero eso mismo
 * hacía que recorrer la pantalla con las flechas cambiara el precio o el
 * porcentaje apenas el foco pasaba cerca, sin que nadie lo haya tocado a
 * propósito. Con texto llano, las flechas navegan como en cualquier otro
 * campo, y el valor solo cambia si se tipea.
 */

/** Dígitos y un solo punto decimal, máximo 2 decimales — precios, porcentajes, importes. */
export function sanitizeDecimal(raw: string): string {
  let next = raw.replace(/[^\d.]/g, '');
  const firstDot = next.indexOf('.');
  if (firstDot !== -1) {
    next = next.slice(0, firstDot + 1) + next.slice(firstDot + 1).replace(/\./g, '');
    const [whole, dec = ''] = next.split('.');
    next = `${whole}.${dec.slice(0, 2)}`;
  }
  return next;
}

/** Solo dígitos — cantidades, número de caja. */
export function sanitizeInteger(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}
