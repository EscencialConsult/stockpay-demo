import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { positionFloatingList } from '../lib/floating';

export type Accion = {
  label: string;
  onClick: () => void;
  /** Acción destructiva (borrar, anular) — se pinta en rojo. */
  malo?: boolean;
};

type Props = {
  acciones: Accion[];
  /** Para lectores de pantalla — qué fila/registro es este menú. */
  label?: string;
};

/**
 * Un botón que despliega varias acciones de una fila, en vez de dos o tres
 * botones chicos pegados: más fácil de acertar con el dedo o con el mouse
 * en mano poco firme, y navegable por teclado igual que `Selector`.
 */
export default function MenuAcciones({ acciones, label = 'Acciones' }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const openList = () => {
    if (!acciones.length) return;
    setHighlight(0);
    if (triggerRef.current) setStyle(positionFloatingList(triggerRef.current, { align: 'right' }));
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (triggerRef.current?.contains(e.target as Node) || listRef.current?.contains(e.target as Node)) return;
      close(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${highlight}"]`)?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (delta: number) => {
    setHighlight((h) => {
      const next = Math.min(Math.max(h + delta, 0), acciones.length - 1);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${next}"]`)?.focus();
      return next;
    });
  };

  const run = (accion: Accion) => {
    close();
    accion.onClick();
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // Mismo motivo que en Selector: no dejar que el Escape se escape hacia
      // un Modal que también lo escucha.
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className="menu-acciones">
      <button
        ref={triggerRef}
        type="button"
        className={`disparador ${open ? 'abierto' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => (open ? close() : openList())}
      >
        <svg className="puntos" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
        <svg
          className="flecha"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="12"
          height="12"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div ref={listRef} className="lista-flotante" role="menu" style={style} onKeyDown={onListKeyDown}>
          {acciones.map((a, i) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              data-idx={i}
              className={a.malo ? 'malo' : ''}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => run(a)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
