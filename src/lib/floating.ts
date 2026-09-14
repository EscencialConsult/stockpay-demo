import type { CSSProperties } from 'react';

/**
 * Ubica una lista `position: fixed` contra su disparador, sin salirse de la
 * ventana. `fixed` y no `absolute` a propósito: adentro de una celda de
 * tabla, `absolute` queda recortado por el `overflow-x: auto` del
 * contenedor — overflow en un eje vuelve `auto` al otro eje también,
 * aunque no se haya pedido. `fixed` se ubica contra la ventana entera.
 */
export function positionFloatingList(
  trigger: HTMLElement,
  opts: { align?: 'left' | 'right'; width?: number } = {}
): CSSProperties {
  const rect = trigger.getBoundingClientRect();
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const margin = 4;
  // Tope aproximado — la lista igual tiene max-height:60vh, esto solo
  // decide si conviene abrir para arriba cuando no entra para abajo.
  const estimatedHeight = 260;
  const openUp = rect.bottom + estimatedHeight > vh && rect.top > estimatedHeight;
  const align = opts.align || 'left';

  const style: CSSProperties = {
    minWidth: opts.width ?? rect.width,
  };
  if (openUp) {
    style.bottom = vh - rect.top + margin;
  } else {
    style.top = rect.bottom + margin;
  }
  if (align === 'left') {
    style.left = rect.left;
  } else {
    style.right = vw - rect.right;
  }
  return style;
}
