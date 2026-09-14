/**
 * Medios de pago — un solo lugar, como en carnicerías (`punto-venta.ts`,
 * `medios`). El `payment_type` numérico es el que ya usa este proyecto
 * (1 = efectivo venía de fábrica); se agregan débito/transferencia/crédito/
 * cheque sin tocar el significado de los que ya existían. `server/routes/
 * closures.js` solo distingue efectivo (1) de todo el resto para el cierre
 * de caja, así que agregar medios acá no rompe esa cuenta.
 *
 * `tecla` es el atajo (F2/F3/F6/F7, igual que la referencia); los que no
 * tienen quedan sin recuadro de atajo en el botón.
 */
export type MedioPago = {
  valor: number;
  etiqueta: string;
  tecla?: string;
};

/** Mismo valor que `CUENTA_CORRIENTE_PAYMENT_TYPE` en server/constants.js. */
export const CUENTA_CORRIENTE = 6;

// Cuenta corriente vive en la fila principal (no en "Otros medios"): en un
// almacén, fiarle a un cliente es una operación tan común como cobrar en
// efectivo, no un caso raro — tenerla escondida hacía pensar que no existía.
export const MEDIOS_DE_TODOS_LOS_DIAS: MedioPago[] = [
  { valor: 1, etiqueta: 'Efectivo', tecla: 'F2' },
  { valor: 2, etiqueta: 'Débito', tecla: 'F3' },
  { valor: 4, etiqueta: 'Transf. / QR', tecla: 'F6' },
  { valor: CUENTA_CORRIENTE, etiqueta: 'Cuenta corriente' },
];

export const OTROS_MEDIOS: MedioPago[] = [
  { valor: 3, etiqueta: 'Crédito' },
  { valor: 5, etiqueta: 'Cheque' },
];

export const TODOS_LOS_MEDIOS: MedioPago[] = [...MEDIOS_DE_TODOS_LOS_DIAS, ...OTROS_MEDIOS];

export function etiquetaMedio(valor: number): string {
  return TODOS_LOS_MEDIOS.find((m) => m.valor === valor)?.etiqueta ?? 'Otro';
}

export function esEfectivo(valor: number): boolean {
  return valor === 1;
}

export function esCuentaCorriente(valor: number): boolean {
  return valor === CUENTA_CORRIENTE;
}
