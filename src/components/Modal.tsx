import { ReactNode, useEffect, useRef } from 'react';
import { ENFOCABLES } from '../lib/flechasEnLaPantalla';
import { setModalActivo } from '../lib/modalActivo';

type Props = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  compact?: boolean;
};

const FOCUSABLE = ENFOCABLES;

export default function Modal({ title, open, onClose, children, footer, wide, compact }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Foco: entra al abrir, se devuelve a quien lo disparó al cerrar — nadie
  // se queda "perdido" en la página de atrás cuando el modal desaparece.
  // Se registra en modalActivo mientras está abierto: lo consultan
  // flechasEnLaPantalla (no mover el fondo) y el atajo Alt+N (no cambiar
  // de pantalla con esto abierto) — mismo rol que TrampaDeFoco.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    setModalActivo(dialogRef.current);
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first || dialogRef.current)?.focus();
    return () => {
      setModalActivo(null);
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    // Trampa de foco simple: Tab no se escapa del modal hacia la página de atrás.
    if (e.key === 'Tab') {
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || !focusables.length) return;
      const list = Array.from(focusables);
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal ${wide ? 'wide' : ''} ${compact ? 'pay' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-header">
          <strong>{title}</strong>
          <button type="button" className="b fantasma" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
