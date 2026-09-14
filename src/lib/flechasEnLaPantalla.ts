import { useEffect } from 'react';
import { getModalActivo } from './modalActivo';

/** Todo lo que se puede enfocar. Mismo criterio que usa el navegador para Tab. */
export const ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Qué tanto castiga desviarse del eje por el que se está yendo. */
const CASTIGO_DESVIO = 3;

/** Píxeles de gracia: dos cosas alineadas casi nunca lo están al píxel. */
const GRACIA = 6;

type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

interface Candidato {
  el: HTMLElement;
  x: number;
  y: number;
  caja: DOMRect;
}

/** Visible de verdad: tiene tamaño y no está escondido por estilo.
 *  NO `offsetParent === null` — un `position: fixed` (el desplegable de un
 *  selector, el menú de acciones) tiene offsetParent nulo aunque se vea. */
function esVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false;
  const estilo = getComputedStyle(el);
  return estilo.visibility !== 'hidden' && estilo.display !== 'none';
}

/** Si el cursor ya está contra el borde hacia el que se apunta. Con
 *  selección abierta se contesta que no: la flecha la deshace primero. */
function elCursorEstaEnLaPunta(el: HTMLElement, direccion: string): boolean {
  const campo = el as HTMLInputElement | HTMLTextAreaElement;
  let inicio: number | null = null;
  let fin: number | null = null;
  try {
    inicio = campo.selectionStart;
    fin = campo.selectionEnd;
  } catch {
    return false;
  }
  if (inicio === null || fin === null) return true;
  if (inicio !== fin) return false;
  const alPrincipio = direccion === 'izquierda' || direccion === 'arriba';
  return alPrincipio ? inicio === 0 : inicio === (campo.value ?? '').length;
}

/** Un contenedor con scroll propio es dueño de la flecha mientras le quede
 *  algo para desplazar en ese sentido. */
function esDesplazable(el: HTMLElement, direccion: Direccion): boolean {
  if (direccion === 'izquierda' || direccion === 'derecha') {
    if (el.scrollWidth <= el.clientWidth + 1) return false;
    const alPrincipio = el.scrollLeft <= 0;
    const alFinal = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
    return direccion === 'izquierda' ? !alPrincipio : !alFinal;
  }
  if (el.scrollHeight <= el.clientHeight + 1) return false;
  const alPrincipio = el.scrollTop <= 0;
  const alFinal = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
  return direccion === 'arriba' ? !alPrincipio : !alFinal;
}

/** Si esta tecla, en este control, le pertenece al control (y no a la
 *  navegación). Por tecla y por situación — ver con-flechas para la lógica
 *  hermana de lista/tabla; esto es la del resto de la pantalla. */
function laTeclaEsDelControl(el: HTMLElement, direccion: Direccion): boolean {
  const vertical = direccion === 'arriba' || direccion === 'abajo';

  if (esDesplazable(el, direccion)) return true;

  if (el.isContentEditable) return !elCursorEstaEnLaPunta(el, direccion);
  const t = el.tagName;
  if (t === 'SELECT') return vertical;
  if (t === 'TEXTAREA') return !elCursorEstaEnLaPunta(el, direccion);
  if (t !== 'INPUT') return false;

  const tipo = (el as HTMLInputElement).type;
  if (tipo === 'range') return true;
  if (tipo === 'number') return vertical || !elCursorEstaEnLaPunta(el, direccion);
  if (['checkbox', 'radio', 'button', 'submit', 'reset', 'file'].includes(tipo)) return false;

  // Texto, fecha, importe escrito a mano: solo el eje horizontal es suyo, y
  // solo mientras haya cursor que mover.
  return !vertical && !elCursorEstaEnLaPunta(el, direccion);
}

/** El control más cerca de la esquina superior izquierda de lo visible
 *  ahora — punto de partida cuando no hay foco previo del que salir. */
function primerVisible(): HTMLElement | null {
  const alto = window.innerHeight;
  const ancho = window.innerWidth;
  let mejor: HTMLElement | null = null;
  let mejorPuntaje = Infinity;

  const raiz = getModalActivo() ?? document;
  raiz.querySelectorAll<HTMLElement>(ENFOCABLES).forEach((el) => {
    if (!esVisible(el)) return;
    const caja = el.getBoundingClientRect();
    if (caja.width === 0 || caja.height === 0) return;
    if (caja.bottom < 0 || caja.top > alto || caja.right < 0 || caja.left > ancho) return;
    const puntaje = Math.max(0, caja.top) + Math.max(0, caja.left);
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = el;
    }
  });
  return mejor;
}

function candidatos(desde: HTMLElement, soloALaVista: boolean): Candidato[] {
  const alto = window.innerHeight;
  const ancho = window.innerWidth;
  const lista: Candidato[] = [];

  // Con un modal abierto, ni buscar afuera.
  const raiz = getModalActivo() ?? document;
  raiz.querySelectorAll<HTMLElement>(ENFOCABLES).forEach((el) => {
    if (el === desde || !esVisible(el)) return;
    const caja = el.getBoundingClientRect();
    if (caja.width === 0 || caja.height === 0) return;
    const afuera = caja.bottom < 0 || caja.top > alto || caja.right < 0 || caja.left > ancho;
    if (soloALaVista && afuera) return;
    // Lo que contiene al foco (una fila alrededor de su botón) no es destino.
    if (el.contains(desde) || desde.contains(el)) return;
    lista.push({ el, x: caja.left + caja.width / 2, y: caja.top + caja.height / 2, caja });
  });
  return lista;
}

function mejorDe(candidatosLista: Candidato[], origen: DOMRect, direccion: Direccion): HTMLElement | null {
  const ox = origen.left + origen.width / 2;
  const oy = origen.top + origen.height / 2;
  const vertical = direccion === 'arriba' || direccion === 'abajo';

  let enLinea: HTMLElement | null = null;
  let puntajeEnLinea = Infinity;
  let suelto: HTMLElement | null = null;
  let puntajeSuelto = Infinity;

  for (const c of candidatosLista) {
    let avance: number;
    if (direccion === 'abajo') avance = c.caja.top - origen.bottom;
    else if (direccion === 'arriba') avance = origen.top - c.caja.bottom;
    else if (direccion === 'derecha') avance = c.caja.left - origen.right;
    else avance = origen.left - c.caja.right;
    if (avance < -GRACIA) continue;

    const desvio = vertical ? Math.abs(c.x - ox) : Math.abs(c.y - oy);

    // "En línea": se solapa con el foco en el eje que no es el del avance.
    const solapa = vertical
      ? c.caja.right - GRACIA > origen.left && c.caja.left + GRACIA < origen.right
      : c.caja.bottom - GRACIA > origen.top && c.caja.top + GRACIA < origen.bottom;

    if (solapa) {
      const puntaje = Math.max(0, avance) + desvio * 0.1;
      if (puntaje < puntajeEnLinea) {
        puntajeEnLinea = puntaje;
        enLinea = c.el;
      }
    } else {
      const puntaje = Math.max(0, avance) + desvio * CASTIGO_DESVIO;
      if (puntaje < puntajeSuelto) {
        puntajeSuelto = puntaje;
        suelto = c.el;
      }
    }
  }

  return enLinea ?? suelto;
}

function buscar(desde: HTMLElement, direccion: Direccion): HTMLElement | null {
  const origen = desde.getBoundingClientRect();
  return (
    mejorDe(candidatos(desde, true), origen, direccion) ??
    mejorDe(candidatos(desde, false), origen, direccion)
  );
}

/**
 * LAS FLECHAS SE MUEVEN POR TODA LA PANTALLA, COMO SI FUERAN EL MOUSE.
 *
 * Puerto directo de `FlechasEnLaPantalla` (carnicerías). Navegación
 * espacial: la flecha sigue la GEOMETRÍA, no el orden del maquetado —
 * apretando ↓ el foco baja a lo que está debajo en la pantalla. Se monta
 * UNA sola vez, arriba de todo (`AppShell`).
 *
 * Cede el paso a `useConFlechas`: si una lista/tabla/botonera ya resolvió
 * la tecla (`preventDefault`), esto ni se entera — así se recorre una tabla
 * en orden en vez de "lo más cercano en diagonal".
 */
export function useFlechasEnLaPantalla() {
  useEffect(() => {
    const mover = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const direccion = (
        { ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha' } as const
      )[e.key];
      if (!direccion) return;

      const modal = getModalActivo();
      if (modal && !modal.contains(document.activeElement)) {
        // El foco se escapó del modal: se lo trae de vuelta en vez de
        // mover lo de atrás.
        e.preventDefault();
        const primero = modal.querySelector<HTMLElement>(ENFOCABLES);
        (primero ?? modal).focus();
        return;
      }

      const foco = document.activeElement as HTMLElement | null;
      if (!foco || foco === document.body) {
        const primero = primerVisible();
        if (!primero) return;
        e.preventDefault();
        primero.focus();
        primero.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return;
      }

      if (laTeclaEsDelControl(foco, direccion)) return;

      const destino = buscar(foco, direccion);
      if (!destino) return;

      e.preventDefault();
      destino.focus();
      destino.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };

    window.addEventListener('keydown', mover);
    return () => window.removeEventListener('keydown', mover);
  }, []);
}
