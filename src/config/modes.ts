/**
 * Modos de operación de la caja.
 *
 * Un solo lugar: el valor interno (el que viaja a la API y a Electron) queda
 * en inglés porque así lo espera el backend — pero la etiqueta que ve el
 * usuario se resuelve siempre desde acá. Ninguna pantalla debe traducir el
 * modo a mano.
 */
export const MODES = [
  'Standalone Point of Sale',
  'Network Point of Sale Server',
  'Network Point of Sale Terminal',
] as const;

export type Mode = (typeof MODES)[number];

export const MODE_LABELS: Record<Mode, string> = {
  'Standalone Point of Sale': 'Independiente',
  'Network Point of Sale Server': 'Servidor de red',
  'Network Point of Sale Terminal': 'Terminal de red',
};

/** Etiqueta corta para mostrar en la barra lateral / encabezados. */
export function modeLabel(mode?: string | null): string {
  if (!mode) return MODE_LABELS['Standalone Point of Sale'];
  return MODE_LABELS[mode as Mode] || mode;
}
