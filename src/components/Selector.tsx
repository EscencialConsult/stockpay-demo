import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { positionFloatingList } from '../lib/floating';

export type SelectorOption = { value: string; label: string };

type Props = {
  value: string;
  options: SelectorOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Alinear la lista contra el borde derecho del disparador en vez del izquierdo. */
  align?: 'left' | 'right';
};

/**
 * Reemplaza al `<select>` nativo donde la lista desplegada importa: acá la
 * lista es HTML propio, con el diseño del sistema en vez del cromado del
 * navegador — y totalmente navegable por teclado (flechas, Enter, Esc),
 * como cualquier combobox accesible.
 */
export default function Selector({ value, options, onChange, placeholder = 'Elegir…', disabled, align = 'left' }: Props) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const openList = () => {
    if (disabled || !options.length) return;
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    setHighlight(idx);
    if (triggerRef.current) setStyle(positionFloatingList(triggerRef.current, { align }));
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
      const next = Math.min(Math.max(h + delta, 0), options.length - 1);
      listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${next}"]`)?.focus();
      return next;
    });
  };

  const pick = (opt: SelectorOption) => {
    onChange(opt.value);
    close();
  };

  const onTriggerKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openList();
    }
  };

  const onListKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      // No dejar que el Escape siga de largo: adentro de un Modal, sin esto
      // un solo Escape cierra la lista Y el modal entero de una — el modal
      // también escucha Escape y el evento le llega igual si no se corta acá.
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(-Infinity);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(Infinity);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[highlight];
      if (opt) pick(opt);
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <div className="selector">
      <button
        ref={triggerRef}
        type="button"
        className="selector-disp"
        disabled={disabled}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="txt">{selected?.label || placeholder}</span>
        <svg
          className="flecha"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div ref={listRef} className="lista-flotante" role="listbox" style={style} onKeyDown={onListKeyDown}>
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              data-idx={i}
              className={[opt.value === value ? 'act' : '', i === highlight ? 'resaltado' : ''].filter(Boolean).join(' ')}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(opt)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
