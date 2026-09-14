// Valores de datos compartidos por más de una ruta/consulta.
// Un solo lugar: si el nombre del cliente ocasional cambia, se cambia acá y
// no hay que rastrear el string suelto en cada archivo.
export const WALK_IN_CUSTOMER = 'Consumidor final';

// Medio de pago "cuenta corriente" — mismo valor que `PAGOS.CUENTA_CORRIENTE`
// en src/config/pagos.ts (frontend). Una venta con este payment_type no cobra
// nada en el momento: suma al saldo del cliente (ver account_movements).
export const CUENTA_CORRIENTE_PAYMENT_TYPE = 6;

// Espejo exacto de TODOS_LOS_MEDIOS en src/config/pagos.ts — el backend
// necesita los mismos valores/etiquetas para el desglose del cierre de
// caja (ver server/routes/closures.js). Si se agrega un medio nuevo, se
// agrega en los dos lugares.
export const MEDIOS_DE_PAGO = [
  { valor: 1, etiqueta: 'Efectivo' },
  { valor: 2, etiqueta: 'Débito' },
  { valor: 4, etiqueta: 'Transf. / QR' },
  { valor: 3, etiqueta: 'Crédito' },
  { valor: 5, etiqueta: 'Cheque' },
  { valor: CUENTA_CORRIENTE_PAYMENT_TYPE, etiqueta: 'Cuenta corriente' },
];
