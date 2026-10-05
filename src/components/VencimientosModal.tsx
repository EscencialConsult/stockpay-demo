import { useMemo } from 'react';
import { Product } from '../api/client';
import {
  COLOR_ESTADO,
  ETIQUETA_ESTADO,
  EstadoVencimiento,
  estadoVencimiento,
  formatearFecha,
  textoDias,
} from '../lib/vencimientos';
import Modal from './Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  products: Product[];
};

/** Resumen de vencimientos del stock: lo que ya venció y lo que está por
 * vencer, ordenado de lo más urgente a lo más lejano. Se abre desde el
 * catálogo para revisar el stock sin tener que recorrer producto por producto. */
export default function VencimientosModal({ open, onClose, products }: Props) {
  const { filas, conteo, sinFecha } = useMemo(() => {
    const conFecha = products
      .filter((p) => p.expires_on)
      .sort((a, b) => a.expires_on.localeCompare(b.expires_on));
    const conteo: Record<EstadoVencimiento, number> = { vencido: 0, critico: 0, proximo: 0, ok: 0 };
    const filas = conFecha.map((p) => {
      const estado = estadoVencimiento(p.expires_on) ?? 'ok';
      conteo[estado] += 1;
      return { producto: p, estado };
    });
    return { filas, conteo, sinFecha: products.length - conFecha.length };
  }, [products]);

  const chips: { estado: EstadoVencimiento; cantidad: number }[] = [
    { estado: 'vencido', cantidad: conteo.vencido },
    { estado: 'critico', cantidad: conteo.critico },
    { estado: 'proximo', cantidad: conteo.proximo },
    { estado: 'ok', cantidad: conteo.ok },
  ];

  return (
    <Modal title="Vencimientos del stock" open={open} onClose={onClose} wide>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {chips.map((c) => (
          <span
            key={c.estado}
            className="chip"
            style={{ borderColor: COLOR_ESTADO[c.estado], color: COLOR_ESTADO[c.estado] }}
          >
            {ETIQUETA_ESTADO[c.estado]}: <strong>{c.cantidad}</strong>
          </span>
        ))}
        <span className="chip muted">Sin fecha: <strong>{sinFecha}</strong></span>
      </div>

      {!filas.length ? (
        <div className="empty">
          Ningún producto tiene fecha de vencimiento. Cargalas desde Catálogo › Vencimientos.
        </div>
      ) : (
        <div className="t-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="d">Código</th>
                <th className="d">Cantidad</th>
                <th>Vence</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(({ producto: p, estado }) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="d cod">{p.code}</td>
                  <td className="d">{p.stock ? p.quantity : '—'}</td>
                  <td>{formatearFecha(p.expires_on)}</td>
                  <td>
                    <span style={{ color: COLOR_ESTADO[estado], fontWeight: 700 }}>
                      {textoDias(p.expires_on)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
