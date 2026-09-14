/**
 * Vocabulario de negocio compartido por más de una pantalla.
 *
 * Un solo lugar: si el nombre del cliente ocasional cambia, se cambia acá y
 * no hay que rastrear el string suelto en cada componente. Tiene que
 * coincidir exactamente con `WALK_IN_CUSTOMER` en `server/constants.js`,
 * porque el backend usa este mismo texto como clave para identificar la
 * fila en la base.
 */
export const CLIENTE_OCASIONAL = 'Consumidor final';

/**
 * Nombre del producto — pantalla de carga, sidebar, login, título de la
 * pestaña. Para venderlo con otro nombre: cambiar esto, `productName` en
 * package.json, y el `<title>` de index.html (ese no puede importar TS,
 * hay que tocarlo a mano). Ver MANUAL-DESARROLLADOR.md.
 */
export const PRODUCT_NAME = 'StockPay';
