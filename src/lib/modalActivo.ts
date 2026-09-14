/**
 * Qué modal está abierto ahora mismo, si hay alguno — mismo rol que
 * `ModalActivoService` en la referencia (carnicerías). Lo escribe Modal.tsx
 * al abrir/cerrar; lo leen `flechasEnLaPantalla` (para no mover el fondo
 * mientras algo lo tapa) y el atajo Alt+número del shell (para no cambiar
 * de pantalla con un modal abierto).
 *
 * No hace falta que sea reactivo (nadie renderiza en base a esto, solo se
 * lee adentro de un manejador de teclado), así que alcanza con una
 * variable de módulo en vez de un store completo.
 */
let elementoActivo: HTMLElement | null = null;

export function setModalActivo(el: HTMLElement | null) {
  elementoActivo = el;
}

export function getModalActivo(): HTMLElement | null {
  return elementoActivo;
}
