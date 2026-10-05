import { useState } from 'react';
import { Product } from '../api/client';
import {
  COLOR_ESTADO,
  DIAS_CRITICO,
  DIAS_PROXIMO,
  EstadoVencimiento,
  estadoVencimiento,
  formatearFecha,
  textoDias,
} from '../lib/vencimientos';

type Props = {
  products: Product[];
  /** Solo se muestra con el módulo de vencimientos prendido. */
  visible: boolean;
  /** Si viene, muestra el botón para abrir el modal de vencimientos (catálogo). */
  onOpen?: () => void;
};

function plural(n: number, uno: string, varios: string) {
  return n === 1 ? `${n} ${uno}` : `${n} ${varios}`;
}

/**
 * Aviso fijo de productos por vencer. Dos niveles:
 * - fuerte: vencidos o que vencen en 7 días (DIAS_CRITICO)
 * - suave: vencen entre 8 y 30 días (DIAS_PROXIMO)
 * "Ver más" despliega la lista de los productos que entran en el aviso.
 * No muestra nada si no hay productos en esos rangos.
 */
export default function AvisoVencimientos({ products, visible, onOpen }: Props) {
  const [expandido, setExpandido] = useState(false);
  if (!visible) return null;

  const incluidos: { producto: Product; estado: EstadoVencimiento }[] = [];
  for (const p of products) {
    const estado = p.expires_on ? estadoVencimiento(p.expires_on) : null;
    if (estado === 'vencido' || estado === 'critico' || estado === 'proximo') {
      incluidos.push({ producto: p, estado });
    }
  }
  if (!incluidos.length) return null;

  // Primero lo más urgente, después por fecha.
  incluidos.sort((a, b) => a.producto.expires_on.localeCompare(b.producto.expires_on));
  const urgentes = incluidos.filter((i) => i.estado !== 'proximo').length;
  const proximos = incluidos.length - urgentes;

  const fuerte = urgentes > 0;
  const colores = fuerte
    ? { borde: 'var(--danger-border)', fondo: 'var(--danger-bg)', texto: 'var(--danger)' }
    : { borde: 'var(--warn)', fondo: 'var(--panel-2)', texto: 'var(--warn)' };

  return (
    <div
      role="status"
      style={{
        border: `1px solid ${colores.borde}`,
        background: colores.fondo,
        color: colores.texto,
        borderRadius: 'var(--rad)',
        padding: '0.6rem 0.9rem',
        marginBottom: '1rem',
        fontWeight: 600,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          {urgentes > 0 && (
            <span>
              ⚠ {plural(urgentes, 'producto vencido o que vence', 'productos vencidos o que vencen')} en{' '}
              {DIAS_CRITICO} días
            </span>
          )}
          {proximos > 0 && (
            <span style={{ fontWeight: 500 }}>
              {plural(proximos, 'producto vence', 'productos vencen')} en los próximos {DIAS_PROXIMO} días
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button type="button" className="b" aria-expanded={expandido} onClick={() => setExpandido(!expandido)}>
            {expandido ? 'Ver menos' : 'Ver más'}
          </button>
          {onOpen && (
            <button type="button" className="b" onClick={onOpen}>
              Ver vencimientos
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <ul style={{ listStyle: 'none', margin: '0.6rem 0 0', padding: 0, display: 'grid', gap: '0.3rem' }}>
          {incluidos.map(({ producto: p, estado }) => (
            <li
              key={p.id}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: '0.25rem 1rem',
                background: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--rad)',
                padding: '0.35rem 0.6rem',
                fontWeight: 500,
                color: 'var(--ink)',
              }}
            >
              <span>{p.name}</span>
              <span style={{ color: COLOR_ESTADO[estado], fontWeight: 700 }}>
                {formatearFecha(p.expires_on)} · {textoDias(p.expires_on)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
