/** Lógica de vencimientos compartida por el panel de carga, el modal de
 * stock y la tabla del catálogo — así un producto muestra el mismo estado
 * en todos lados. Las fechas viajan como AAAA-MM-DD (ver server/routes). */

export type EstadoVencimiento = 'vencido' | 'critico' | 'proximo' | 'ok';

/** Umbrales en días. Se usan en el modal y en la tabla. */
export const DIAS_CRITICO = 7;
export const DIAS_PROXIMO = 30;

/** Días desde hoy hasta la fecha: negativo si ya venció, 0 si vence hoy.
 * Se compara a medianoche local para que "vence hoy" dé 0 todo el día. */
export function diasHasta(fecha: string): number | null {
  if (!fecha) return null;
  const [y, m, d] = fecha.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return null;
  const objetivo = new Date(y, m - 1, d).getTime();
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  return Math.round((objetivo - inicioHoy) / 86_400_000);
}

export function estadoVencimiento(fecha: string): EstadoVencimiento | null {
  const dias = diasHasta(fecha);
  if (dias === null) return null;
  if (dias < 0) return 'vencido';
  if (dias <= DIAS_CRITICO) return 'critico';
  if (dias <= DIAS_PROXIMO) return 'proximo';
  return 'ok';
}

/** Color del estado, con los tokens de la app (ver index.css). */
export const COLOR_ESTADO: Record<EstadoVencimiento, string> = {
  vencido: 'var(--bad)',
  critico: 'var(--bad)',
  proximo: 'var(--warn)',
  ok: 'var(--ok)',
};

export const ETIQUETA_ESTADO: Record<EstadoVencimiento, string> = {
  vencido: 'Vencido',
  critico: 'Vence en 7 días',
  proximo: 'Vence en 30 días',
  ok: 'Vigente',
};

/** AAAA-MM-DD -> DD/MM/AAAA, sin pasar por Date (evita el corrimiento de un día). */
export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  if (!y || !m || !d) return fecha;
  return `${d}/${m}/${y}`;
}

/** Texto corto de cuánto falta: "Venció hace 3 días", "Vence hoy", "Faltan 12 días". */
export function textoDias(fecha: string): string {
  const dias = diasHasta(fecha);
  if (dias === null) return '';
  if (dias < 0) return `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`;
  if (dias === 0) return 'Vence hoy';
  return `Faltan ${dias} ${dias === 1 ? 'día' : 'días'}`;
}
