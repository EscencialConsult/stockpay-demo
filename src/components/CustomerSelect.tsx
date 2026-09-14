import { useEffect, useMemo, useRef, useState } from 'react';
import { api, Customer } from '../api/client';
import { CLIENTE_OCASIONAL } from '../config/textos';

type Props = {
  customers: Customer[];
  value: string;
  onChange: (customerId: string) => void;
  onCustomersChanged?: () => Promise<void> | void;
};

const WALK_IN = { id: '0', name: CLIENTE_OCASIONAL, phone: '', email: '', address: '' };

export default function CustomerSelect({
  customers,
  value,
  onChange,
  onCustomersChanged,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const list = useMemo(() => {
    return customers.filter((c) => c.name !== CLIENTE_OCASIONAL);
  }, [customers]);

  const selected = useMemo(() => {
    if (value === '0' || !value) return WALK_IN;
    const found = list.find((c) => String(c.id) === String(value));
    return found
      ? {
          id: String(found.id),
          name: found.name,
          phone: found.phone || '',
          email: found.email || '',
          address: found.address || '',
        }
      : WALK_IN;
  }, [value, list]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const walkIn = { ...WALK_IN };
    const matches = !q
      ? list
      : list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone || '').toLowerCase().includes(q) ||
            (c.email || '').toLowerCase().includes(q)
        );
    if (!q || 'walk-in'.includes(q) || 'walk in'.includes(q)) {
      return [walkIn, ...matches];
    }
    return matches;
  }, [list, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowQuickAdd(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setShowQuickAdd(false);
    setQuery('');
    setError(null);
  };

  const quickAdd = async () => {
    if (!newName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveCustomer({
        name: newName.trim(),
        phone: newPhone.trim(),
        email: '',
        address: '',
      });
      await onCustomersChanged?.();
      const refreshed = await api.getCustomers();
      const created =
        refreshed
          .filter((c) => c.name === newName.trim())
          .sort((a, b) => b.id - a.id)[0] || null;
      setNewName('');
      setNewPhone('');
      setShowQuickAdd(false);
      if (created) pick(String(created.id));
      else {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el cliente');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="customer-select" ref={rootRef}>
      <button
        type="button"
        className={`customer-select-trigger ${open ? 'open' : ''}`}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <span className="customer-avatar">{selected.name.slice(0, 1).toUpperCase()}</span>
        <span className="customer-meta">
          <strong>{selected.name}</strong>
          <span>{selected.phone || (selected.id === '0' ? 'Sin cuenta' : 'Sin teléfono')}</span>
        </span>
        <span className="customer-caret">▾</span>
      </button>

      {open && (
        <div className="customer-select-panel">
          <div className="customer-search">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o teléfono…"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                }
                if (e.key === 'Enter' && filtered[0]) {
                  e.preventDefault();
                  pick(String(filtered[0].id));
                }
              }}
            />
          </div>

          {error && <div className="error" style={{ margin: '0.5rem 0.65rem' }}>{error}</div>}

          <div className="customer-options">
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`customer-option ${String(c.id) === String(value) || (c.id === '0' && value === '0') ? 'active' : ''}`}
                onClick={() => pick(String(c.id))}
              >
                <span className="customer-avatar small">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="customer-meta">
                  <strong>{c.name}</strong>
                  <span>{c.phone || (String(c.id) === '0' ? 'Cliente por defecto' : 'Sin teléfono')}</span>
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="empty" style={{ padding: '0.85rem' }}>
                Sin resultados
              </div>
            )}
          </div>

          {!showQuickAdd ? (
            <button
              type="button"
              className="customer-add-toggle"
              onClick={() => {
                setShowQuickAdd(true);
                setNewName(query.trim());
              }}
            >
              + Nuevo cliente
            </button>
          ) : (
            <div className="customer-quick-add">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del cliente"
                autoFocus
              />
              <input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Teléfono (opcional)"
              />
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="b pri"
                  disabled={busy}
                  onClick={quickAdd}
                  style={{ flex: 1 }}
                >
                  {busy ? 'Guardando…' : 'Agregar y elegir'}
                </button>
                <button
                  type="button"
                  className="b"
                  onClick={() => {
                    setShowQuickAdd(false);
                    setError(null);
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
