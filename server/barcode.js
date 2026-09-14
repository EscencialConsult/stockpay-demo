// Generador de código de barras interno — EAN-13 válido, formato:
//   20  PPPPPP  0000  C
//   └┬┘  └──┬──┘ └─┬─┘ └ dígito de control (checksum)
// prefijo    id    relleno
//
// El prefijo 20-29 está reservado por el estándar GS1 para uso interno de
// un comercio — nunca choca con el código de fábrica real de un producto
// envasado, así que un producto sin código de fábrica siempre puede tener
// uno propio, imprimible y escaneable, sin pisar a ningún otro.
//
// 6 dígitos para el id (hasta 999.999 productos) — con 5 dos productos con
// id 1 y 100001 generaban el mismo código, porque el recorte a 5 dígitos se
// comía el primero en silencio.
//
// El checksum es el mismo algoritmo EAN-13 estándar (no inventado acá):
// mismo cálculo que usa el sistema de referencia para VALIDAR un código
// leído. Acá se usa al revés, para calcular el dígito que hace falta.
export function generateEan13(productId) {
  const plu = String(productId).padStart(6, '0').slice(-6);
  const body = `20${plu}0000`; // 12 dígitos
  const digits = body.split('').map(Number);
  const sum = digits.reduce((s, n, i) => s + n * (i % 2 === 0 ? 1 : 3), 0);
  const control = (10 - (sum % 10)) % 10;
  return `${body}${control}`;
}

/** ¿Este código de 13 dígitos tiene un checksum EAN-13 válido? */
export function isValidEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const sum = digits.slice(0, 12).reduce((s, n, i) => s + n * (i % 2 === 0 ? 1 : 3), 0);
  const control = (10 - (sum % 10)) % 10;
  return control === digits[12];
}
