import { RefObject, useEffect } from 'react';

/** Lo que se puede enfocar adentro del contenedor, en el orden del maquetado. */
const ENFOCABLES = 'a[href], button:not([disabled]), [tabindex="0"]';

/**
 * MOVERSE CON LAS FLECHAS ADENTRO DE UNA LISTA, UNA TABLA O UNA BOTONERA.
 *
 * Puerto directo de `ConFlechas` (carnicerías, `shared/ui/con-flechas.ts`) —
 * misma lógica exacta, hook en vez de directiva de Angular. Se engancha en
 * el CONTENEDOR (la lista, la tabla, la botonera) y mueve el foco entre lo
 * que se puede enfocar adentro:
 *
 *   ↑ ↓   en una lista vertical        ← →   en una tira horizontal
 *   Inicio / Fin   al primero o al último
 *
 * NO SE DA LA VUELTA a propósito: en el último, la flecha se queda ahí.
 * NO PISA LA ESCRITURA: si el foco está en un input/textarea/select o algo
 * editable, la tecla es de ese control y sigue de largo.
 * NO CAMBIA EL TABULADOR: Tab sigue igual, esto es un camino más rápido.
 *
 * SOLO EL PRIMER NIVEL: una fila con sus propios botones («Editar»,
 * «Borrar») no hace que la flecha se meta adentro — se filtra lo que ya
 * está contenido en otro navegable, así que la fila entera cuenta como un
 * solo paso. Funciona igual para una tabla que para una botonera.
 */
export function useConFlechas(
  ref: RefObject<HTMLElement | null>,
  sentido: 'vertical' | 'horizontal' = 'vertical'
) {
  useEffect(() => {
    const contenedor = ref.current;
    if (!contenedor) return;

    const mover = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      const foco = document.activeElement as HTMLElement | null;
      if (!foco) return;

      // Escribir gana: en un input/textarea/select las flechas son del control.
      const etiqueta = foco.tagName;
      if (etiqueta === 'INPUT' || etiqueta === 'TEXTAREA' || etiqueta === 'SELECT') return;
      if (foco.isContentEditable) return;

      const vertical = sentido === 'vertical';
      const siguiente = vertical ? 'ArrowDown' : 'ArrowRight';
      const anterior = vertical ? 'ArrowUp' : 'ArrowLeft';

      let paso: number;
      if (e.key === siguiente) paso = 1;
      else if (e.key === anterior) paso = -1;
      else if (e.key === 'Home') paso = -Infinity;
      else if (e.key === 'End') paso = Infinity;
      else return;

      const visibles = [...contenedor.querySelectorAll<HTMLElement>(ENFOCABLES)].filter(
        (x) => x.offsetParent !== null
      );

      // Descarta lo que está contenido en otro navegable (botones de una
      // fila), y queda lo que el usuario entiende como "el próximo".
      const items = visibles.filter((x) => !visibles.some((y) => y !== x && y.contains(x)));
      if (items.length < 2) return;

      const idxDirecto = items.indexOf(foco);
      const actual = idxDirecto !== -1 ? idxDirecto : items.findIndex((x) => x.contains(foco));
      if (actual === -1) return;

      const destino =
        paso === -Infinity
          ? 0
          : paso === Infinity
            ? items.length - 1
            : Math.min(items.length - 1, Math.max(0, actual + paso));

      if (destino === actual) return;

      e.preventDefault();
      items[destino].focus();
    };

    contenedor.addEventListener('keydown', mover);
    return () => contenedor.removeEventListener('keydown', mover);
  }, [ref, sentido]);
}
