import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

type LabelProduct = { name: string; price: number; code: string };

type Props = {
  /** Producto a imprimir — al cambiar de null a un producto, imprime solo. */
  product: LabelProduct | null;
  symbol: string;
  onDone: () => void;
};

/**
 * Etiqueta de precio con código de barras — no existía en el sistema de
 * referencia (carnicerías tampoco la tiene), es funcionalidad nueva. Dibuja
 * el EAN-13 con JsBarcode (autohospedada, sin red) y dispara la impresión
 * sola, mismo patrón que el ticket de venta de TillView.
 */
export default function PrintLabel({ product, symbol, onDone }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!product || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, product.code, {
        format: 'EAN13',
        width: 2,
        height: 46,
        fontSize: 13,
        margin: 6,
      });
    } catch {
      /* código con formato raro (ej. EAN de fábrica corto) — se imprime igual, sin barras */
    }
    const t = setTimeout(() => {
      window.print();
      onDone();
    }, 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  if (!product) return null;

  return (
    <div id="label-print" className="label-print">
      <div className="label-name">{product.name}</div>
      <div className="label-price">
        {symbol}
        {product.price.toFixed(2)}
      </div>
      <svg ref={svgRef} />
    </div>
  );
}
