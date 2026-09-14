import { useEffect, useMemo, useRef, useState } from 'react';
import {
  api,
  CartItem,
  Category,
  Closure,
  ClosureSummary,
  Customer,
  Product,
  Settings,
  getUploadsBase,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import CustomerSelect from '../components/CustomerSelect';
import { CLIENTE_OCASIONAL } from '../config/textos';
import {
  MEDIOS_DE_TODOS_LOS_DIAS,
  OTROS_MEDIOS,
  esEfectivo,
  esCuentaCorriente,
  etiquetaMedio,
} from '../config/pagos';
import { sanitizeDecimal } from '../lib/numericInput';

type Props = {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  settings: Settings | null;
  onRefresh: () => Promise<void>;
};

export default function TillView({
  products,
  categories,
  customers,
  settings,
  onRefresh,
}: Props) {
  const { user, apiInfo } = useAuth();
  const scanRef = useRef<HTMLInputElement>(null);
  // Auditado contra punto-venta.html de carnicerías: la Caja de la
  // referencia NO usa conFlechas en ningún lado (ni el carrito, que
  // también es una tabla, ni los medios de pago, ni los chips) — eso queda
  // solo para la botonera del shell (ver AppShell). Acá todo lo mueve
  // flechasEnLaPantalla, montada una vez en App.tsx, que sigue la posición
  // real en pantalla en cualquier dirección — cart-list, chips,
  // pay-methods y la grilla de productos no necesitan cablearse a mano.
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [customerId, setCustomerId] = useState('0');
  const [discount, setDiscount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paid, setPaid] = useState('');
  const [paymentType, setPaymentType] = useState(1);
  const [receipt, setReceipt] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  // Todavía no hay una impresora fiscal conectada — esto imprime con el
  // diálogo del sistema operativo. Se recuerda la preferencia entre ventas
  // porque un local que no imprime nunca no debería tener que apagarlo cada
  // vez, y uno que siempre imprime tampoco debería prenderlo cada vez.
  const [printReceipt, setPrintReceipt] = useState(() => {
    try {
      return localStorage.getItem('pos_print_receipt') !== '0';
    } catch {
      return true;
    }
  });
  const [showClose, setShowClose] = useState(false);
  const [closeSummary, setCloseSummary] = useState<ClosureSummary | null>(null);
  const [cashCounted, setCashCounted] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeBusy, setCloseBusy] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<Closure | null>(null);
  const [otrosMediosAbiertos, setOtrosMediosAbiertos] = useState(false);
  // La cantidad se edita a propósito, como en carnicerías: se entra con
  // Enter, y recién ADENTRO las flechas ← y → suman y restan. Si ←/→
  // movieran la cantidad todo el tiempo, le robarían la tecla a
  // flechasEnLaPantalla — no se podría saltar del renglón a otra parte de
  // la pantalla sin pasar antes por el numpad de +/-.
  const [editandoCantidadId, setEditandoCantidadId] = useState<number | null>(null);

  const symbol = settings?.symbol || '$';
  const taxRate = settings?.charge_tax ? Number(settings.percentage) || 0 : 0;
  const uploads = getUploadsBase();
  const till = apiInfo?.till || settings?.till || 1;

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('pos_print_receipt', printReceipt ? '1' : '0');
    } catch {
      /* localStorage puede fallar en algún perfil raro — no es crítico. */
    }
  }, [printReceipt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // El medio de pago se puede elegir ANTES de escanear el primer
      // producto — es un orden de trabajo tan válido como el otro, y frenar
      // esto acá (o con el atributo disabled en el botón) hacía que
      // Transferencia pareciera rota si se apretaba primero. Solo "Cobrar"
      // necesita carrito.
      if (e.key === 'F2') {
        e.preventDefault();
        selectMethod(1);
      }
      if (e.key === 'F3') {
        e.preventDefault();
        selectMethod(2);
      }
      if (e.key === 'F6') {
        e.preventDefault();
        selectMethod(4);
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setOtrosMediosAbiertos(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length) completeSale();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (cart.length) clearCart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, paymentType, paid, customerId]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    // While typing a barcode, keep the grid browsable by category only if empty query feels better
    return products.filter((p) => {
      const catOk = categoryFilter === 'all' || p.category === categoryFilter;
      if (!q) return catOk;
      return (
        catOk &&
        (p.name.toLowerCase().includes(q) || String(p.id).includes(q))
      );
    });
  }, [products, query, categoryFilter]);

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const afterDiscount = Math.max(0, subtotal - (Number(discount) || 0));
  const tax = afterDiscount * (taxRate / 100);
  const total = afterDiscount + tax;
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const stockLabel = (p: Product) => {
    if (!p.stock) return { text: 'Sin límite de stock', className: 'stock-badge' };
    if (p.quantity <= 0) return { text: 'Sin stock', className: 'stock-badge out' };
    if (p.quantity <= 5) return { text: `Quedan ${p.quantity}`, className: 'stock-badge low' };
    return { text: `${p.quantity} en stock`, className: 'stock-badge' };
  };

  const addToCart = (product: Product) => {
    if (product.stock && product.quantity <= 0) {
      setError(`${product.name} no tiene stock`);
      return;
    }
    setError(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (product.stock && existing.quantity >= product.quantity) {
          setError(`Solo hay ${product.quantity} disponibles de ${product.name}`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          stock: product.quantity,
        },
      ];
    });
  };

  const setQty = (id: number, quantity: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscount('');
    setCustomerId('0');
    setError(null);
    setPaymentType(1);
    setPaid('');
    setOtrosMediosAbiertos(false);
    scanRef.current?.focus();
  };

  const onScan = async () => {
    const code = query.trim();
    if (!code) return;
    try {
      const product = await api.findBySku(code);
      if (product) {
        addToCart(product);
        setQuery('');
        scanRef.current?.focus();
        return;
      }
      // fallback local match by id or exact name
      const local =
        products.find((p) => String(p.id) === code) ||
        products.find((p) => p.name.toLowerCase() === code.toLowerCase());
      if (local) {
        addToCart(local);
        setQuery('');
        scanRef.current?.focus();
      } else {
        setError(`No hay producto para “${code}”`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló el escaneo');
    }
  };

  const buildTransaction = (status: number, paidAmount: number, changeAmt: number) => {
    const customer = customers.find((c) => String(c.id) === customerId);
    return {
      ref_number: '',
      customer: customerId,
      customer_name: customer?.name || CLIENTE_OCASIONAL,
      status,
      user_id: user?._id || 0,
      user: user?.fullname || '',
      till,
      discount: Number(discount) || 0,
      subtotal,
      tax,
      total,
      paid: paidAmount,
      change: changeAmt,
      payment_type: paymentType,
      items: cart,
      date: new Date().toISOString(),
    };
  };

  /**
   * Elegir medio de pago — igual que carnicerías: efectivo se completa a
   * mano, el resto va por el total. El total se recalcula solo (no se
   * congela un importe al elegir el medio): como el panel de pago queda
   * siempre visible mientras se sigue cargando el carrito, un importe fijo
   * quedaría viejo apenas se agrega o saca un producto.
   */
  const selectMethod = (valor: number) => {
    setPaymentType(valor);
    if (esEfectivo(valor) || esCuentaCorriente(valor)) setPaid('');
  };

  /**
   * Lo que realmente se cobra ahora: manual en efectivo o cuenta corriente
   * (en cuenta corriente puede ser parcial, o directamente 0 — el resto
   * queda a cuenta del cliente), el total completo en cualquier otro medio.
   */
  const effectivePaid =
    esEfectivo(paymentType) || esCuentaCorriente(paymentType) ? parseFloat(paid) || 0 : total;
  /** Lo que queda pendiente en la cuenta del cliente — solo tiene sentido en cuenta corriente. */
  const pendienteCuenta = Math.max(0, total - effectivePaid);

  const completeSale = async () => {
    if (!cart.length) return;
    if (esCuentaCorriente(paymentType) && customerId === '0') {
      setError('La cuenta corriente necesita un cliente elegido — no Consumidor final.');
      return;
    }
    if (esCuentaCorriente(paymentType)) {
      if (effectivePaid > total + 0.0001) {
        setError('En cuenta corriente, lo que paga ahora no puede ser mayor al total.');
        return;
      }
    } else if (effectivePaid + 0.0001 < total) {
      setError('El monto entregado es menor al total');
      return;
    }
    const changeAmt = esCuentaCorriente(paymentType) ? 0 : Math.max(0, effectivePaid - total);
    const body = buildTransaction(1, effectivePaid, changeAmt);
    try {
      await api.createTransaction(body);
      const lines = [
        settings?.store || 'StockPay',
        settings?.address_one || '',
        settings?.contact || '',
        '--------------------------------',
        ...cart.map(
          (i) =>
            `${i.quantity} x ${i.name}`.padEnd(22) +
            `${symbol}${(i.price * i.quantity).toFixed(2)}`
        ),
        '--------------------------------',
        `Subtotal ${symbol}${subtotal.toFixed(2)}`,
        taxRate ? `Impuesto ${taxRate}% ${symbol}${tax.toFixed(2)}` : '',
        Number(discount) > 0 ? `Descuento -${symbol}${Number(discount).toFixed(2)}` : '',
        `TOTAL ${symbol}${total.toFixed(2)}`,
        `${etiquetaMedio(paymentType)} ${symbol}${effectivePaid.toFixed(2)}`,
        esCuentaCorriente(paymentType) && pendienteCuenta > 0
          ? `Queda a cuenta ${symbol}${pendienteCuenta.toFixed(2)}`
          : '',
        esCuentaCorriente(paymentType) ? '' : `Vuelto ${symbol}${changeAmt.toFixed(2)}`,
        `Caja ${apiInfo?.till || 1} · ${user?.fullname || ''}`,
        settings?.footer || 'Gracias por su compra',
        new Date().toLocaleString(),
      ]
        .filter(Boolean)
        .join('\n');
      setReceipt(lines);
      setShowReceipt(true);
      clearCart();
      await onRefresh();
      // Imprimir es opcional (ver toggle en el panel de pago) — cuando está
      // apagado, esto solo deja el ticket en pantalla para mirarlo.
      if (printReceipt) setTimeout(() => window.print(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la venta');
    }
  };

  const openClose = async () => {
    setCloseError(null);
    setCloseResult(null);
    setCashCounted('');
    setCloseNotes('');
    try {
      const summary = await api.getClosureSummary(till);
      setCloseSummary(summary);
      setShowClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo obtener el resumen de caja');
    }
  };

  const confirmClose = async () => {
    setCloseError(null);
    setCloseBusy(true);
    try {
      const result = await api.closeTill({
        till,
        cashCounted: parseFloat(cashCounted) || 0,
        notes: closeNotes,
      });
      setCloseResult(result);
      setCloseSummary(null);
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : 'No se pudo cerrar la caja');
    } finally {
      setCloseBusy(false);
    }
  };

  return (
    <>
      {error && (
        <div className="error">
          {error}{' '}
          <button type="button" className="b fantasma" onClick={() => setError(null)}>
            descartar
          </button>
        </div>
      )}

      <div className="till">
        <section className="panel till-left">
          <div className="scan-bar">
            <input
              ref={scanRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onScan();
              }}
              placeholder="Escaneá el código de barras o buscá — Enter para agregar"
              autoFocus
            />
            <button type="button" className="b pri" onClick={onScan}>
              Agregar
            </button>
            <button
              type="button"
              className="b malo"
              onClick={clearCart}
              disabled={!cart.length}
              title="Vacía el carrito y empieza de nuevo"
            >
              Cancelar venta
              <span className="kbd">Esc</span>
            </button>
          </div>
          <div className="chips">
            <button
              type="button"
              className={`chip ${categoryFilter === 'all' ? 'active' : ''}`}
              onClick={() => setCategoryFilter('all')}
            >
              Todas
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${categoryFilter === c.name ? 'active' : ''}`}
                onClick={() => setCategoryFilter(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {filteredProducts.map((p) => {
              const stock = stockLabel(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className="product-tile"
                  onClick={() => addToCart(p)}
                  disabled={!!p.stock && p.quantity <= 0}
                >
                  {p.img ? (
                    <div className="product-thumb-wrap">
                      <img className="product-thumb" src={`${uploads}/${p.img}`} alt="" />
                    </div>
                  ) : (
                    <div className="product-thumb-wrap">
                      <div className="product-thumb placeholder" />
                    </div>
                  )}
                  <div className="product-tile-body">
                    <strong>{p.name}</strong>
                    <span className="price">
                      {symbol}
                      {Number(p.price).toFixed(2)}
                    </span>
                    <span className={stock.className}>{stock.text}</span>
                  </div>
                </button>
              );
            })}
            {!filteredProducts.length && (
              <div className="empty">No hay productos acá. Agregalos desde Catálogo.</div>
            )}
          </div>
        </section>

        <section className="panel till-right">
          <div className="cart-head">
            <CustomerSelect
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              onCustomersChanged={onRefresh}
            />
            <button type="button" className="b" onClick={openClose}>
              Cerrar caja
            </button>
          </div>

          <div className="cart-list">
            {cart.map((item) => {
              const editando = editandoCantidadId === item.id;
              return (
              <div
                className={`cart-row ${editando ? 'editando' : ''}`}
                key={item.id}
                tabIndex={0}
                role="group"
                aria-label={
                  editando
                    ? `${item.name}, editando cantidad. Flechas para sumar y restar, Enter o Escape para salir`
                    : `${item.name}, cantidad ${item.quantity}. Enter para editar la cantidad, Suprimir para sacarlo`
                }
                onKeyDown={(e) => {
                  // Adentro de la edición, ← y → son de la cantidad — igual
                  // que carnicerías, para no robarle el eje horizontal a
                  // flechasEnLaPantalla el resto del tiempo.
                  if (editando) {
                    if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      setQty(item.id, item.quantity + 1);
                      return;
                    }
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      setQty(item.id, Math.max(1, item.quantity - 1));
                      return;
                    }
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setEditandoCantidadId(null);
                      return;
                    }
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setEditandoCantidadId(item.id);
                    return;
                  }
                  if (e.key === 'Delete' || e.key === 'Backspace') {
                    e.preventDefault();
                    setQty(item.id, 0);
                  }
                }}
                onBlur={() => setEditandoCantidadId((id) => (id === item.id ? null : id))}
              >
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted">
                    {symbol}
                    {item.price.toFixed(2)} c/u
                  </div>
                </div>
                <div className="qty">
                  <button type="button" tabIndex={-1} onClick={() => setQty(item.id, item.quantity - 1)}>
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" tabIndex={-1} onClick={() => setQty(item.id, item.quantity + 1)}>
                    +
                  </button>
                </div>
                <strong>
                  {symbol}
                  {(item.price * item.quantity).toFixed(2)}
                </strong>
              </div>
              );
            })}
            {!cart.length && (
              <div className="empty">Carrito vacío — escaneá o tocá un producto</div>
            )}
          </div>

          <div className="totals">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Descuento ({symbol})</label>
              <input
                value={discount}
                onChange={(e) => setDiscount(sanitizeDecimal(e.target.value))}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
            <div className="row">
              <span>
                {itemCount} ítem{itemCount === 1 ? '' : 's'}
              </span>
              <span>
                {symbol}
                {subtotal.toFixed(2)}
              </span>
            </div>
            {!!taxRate && (
              <div className="row">
                <span>Impuesto {taxRate}%</span>
                <span>
                  {symbol}
                  {tax.toFixed(2)}
                </span>
              </div>
            )}
            <div className="row grand">
              <span>Total</span>
              <span>
                {symbol}
                {total.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pay-inline">
            <div className="pay-methods">
              {MEDIOS_DE_TODOS_LOS_DIAS.map((m) => (
                <button
                  key={m.valor}
                  type="button"
                  className={`b pay-method ${paymentType === m.valor ? 'pri' : ''}`}
                  onClick={() => selectMethod(m.valor)}
                >
                  {m.etiqueta}
                  {m.tecla && <span className="kbd">{m.tecla}</span>}
                </button>
              ))}
              <button
                type="button"
                className={`b pay-method ${otrosMediosAbiertos ? 'pri' : ''}`}
                onClick={() => setOtrosMediosAbiertos(true)}
              >
                Otros medios
                <span className="kbd">F7</span>
              </button>
            </div>
            {(otrosMediosAbiertos || OTROS_MEDIOS.some((m) => m.valor === paymentType)) && (
              <div className="pay-methods pay-methods-otros">
                {OTROS_MEDIOS.map((m) => (
                  <button
                    key={m.valor}
                    type="button"
                    className={`b pay-method ${paymentType === m.valor ? 'pri' : ''}`}
                    onClick={() => selectMethod(m.valor)}
                  >
                    {m.etiqueta}
                  </button>
                ))}
              </div>
            )}

            {esCuentaCorriente(paymentType) && customerId === '0' && (
              <p className="notice" style={{ margin: '0.4rem 0 0' }}>
                Elegí un cliente arriba — la cuenta corriente no va a Consumidor final.
              </p>
            )}

            {esEfectivo(paymentType) && (
              <>
                <div className="field" style={{ marginBottom: '0.4rem' }}>
                  <label>Recibido</label>
                  <input
                    value={paid}
                    onChange={(e) => setPaid(sanitizeDecimal(e.target.value))}
                    placeholder="Ingresá el monto recibido"
                    inputMode="decimal"
                  />
                </div>
                <p className="pay-change">
                  {effectivePaid + 0.0001 < total ? 'Falta' : 'Vuelto'}{' '}
                  <strong>
                    {symbol}
                    {Math.abs(effectivePaid - total).toFixed(2)}
                  </strong>
                </p>
              </>
            )}

            {esCuentaCorriente(paymentType) && (
              <>
                <div className="field" style={{ marginBottom: '0.4rem' }}>
                  <label>Paga ahora (opcional)</label>
                  <input
                    value={paid}
                    onChange={(e) => setPaid(sanitizeDecimal(e.target.value))}
                    placeholder="Dejalo vacío si no paga nada ahora"
                    inputMode="decimal"
                  />
                </div>
                <p className="pay-change">
                  {pendienteCuenta > 0 ? (
                    <>
                      Va a la cuenta <strong>{symbol}{pendienteCuenta.toFixed(2)}</strong>
                    </>
                  ) : (
                    <strong>Paga el total ahora — no queda nada a cuenta</strong>
                  )}
                </p>
              </>
            )}

            <button
              type="button"
              className={`modo ${printReceipt ? 'on' : ''}`}
              role="switch"
              aria-checked={printReceipt}
              onClick={() => setPrintReceipt((v) => !v)}
              title="Con esto apagado, el ticket se muestra en pantalla pero no se manda a imprimir"
              style={{ margin: '0.6rem 0 0' }}
            >
              <span className="riel" aria-hidden="true">
                <span className="bolita" />
              </span>
              <span className="et">Imprimir ticket {printReceipt ? 'Sí' : 'No'}</span>
            </button>
          </div>

          <div className="cart-actions">
            <button
              type="button"
              className="b pri grande pay"
              onClick={completeSale}
              disabled={
                !cart.length ||
                (esCuentaCorriente(paymentType) &&
                  (customerId === '0' || effectivePaid > total + 0.0001)) ||
                (!esCuentaCorriente(paymentType) && effectivePaid + 0.0001 < total)
              }
            >
              Cobrar {symbol}
              {total.toFixed(2)}
              <span className="kbd">F4</span>
            </button>
          </div>
        </section>
      </div>

      <Modal
        title="Ticket de venta"
        open={showReceipt}
        onClose={() => setShowReceipt(false)}
        compact
        footer={
          <>
            <button type="button" className="b" onClick={() => setShowReceipt(false)}>
              Cerrar
            </button>
            <button type="button" className="b pri" onClick={() => window.print()}>
              Imprimir
            </button>
          </>
        }
      >
        <pre className="receipt">{receipt}</pre>
      </Modal>
      <pre id="receipt-print" className="receipt-print-only">
        {receipt}
      </pre>

      <Modal
        title="Cierre de caja"
        open={showClose}
        onClose={() => setShowClose(false)}
        compact
        footer={
          closeResult ? (
            <button type="button" className="b pri" onClick={() => setShowClose(false)}>
              Listo
            </button>
          ) : (
            <>
              <button type="button" className="b" onClick={() => setShowClose(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="b pri"
                onClick={confirmClose}
                disabled={closeBusy || !closeSummary}
              >
                {closeBusy ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </>
          )
        }
      >
        {closeError && <div className="error">{closeError}</div>}

        {closeResult ? (
          <>
            <p className="muted">
              Caja {closeResult.till} cerrada por {closeResult.user || user?.fullname} el{' '}
              {new Date(closeResult.date).toLocaleString()}.
            </p>
            <div className="row">
              <span>Ventas del período</span>
              <span>{closeResult.sales_count}</span>
            </div>
            <div className="row">
              <span>Efectivo esperado</span>
              <span>
                {symbol}
                {closeResult.cash_expected.toFixed(2)}
              </span>
            </div>
            <div className="row">
              <span>Efectivo contado</span>
              <span>
                {symbol}
                {closeResult.cash_counted.toFixed(2)}
              </span>
            </div>
            <div className="row grand">
              <span>{closeResult.cash_difference < 0 ? 'Falta' : 'Sobra'}</span>
              <span>
                {symbol}
                {Math.abs(closeResult.cash_difference).toFixed(2)}
              </span>
            </div>
          </>
        ) : closeSummary ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Ventas pagadas desde el {new Date(closeSummary.periodStart).toLocaleString()} en la
              caja {closeSummary.till}.
            </p>
            <div className="row">
              <span>Cantidad de ventas</span>
              <span>{closeSummary.salesCount}</span>
            </div>
            <div className="row">
              <span>Efectivo esperado</span>
              <span>
                {symbol}
                {closeSummary.cashExpected.toFixed(2)}
              </span>
            </div>
            <div className="row">
              <span>Otros medios</span>
              <span>
                {symbol}
                {closeSummary.cardTotal.toFixed(2)}
              </span>
            </div>
            <div className="row grand">
              <span>Total</span>
              <span>
                {symbol}
                {closeSummary.total.toFixed(2)}
              </span>
            </div>
            <div className="field" style={{ marginTop: '0.75rem' }}>
              <label>Efectivo contado</label>
              <input
                value={cashCounted}
                onChange={(e) => setCashCounted(e.target.value)}
                inputMode="decimal"
                placeholder="Contá el efectivo del cajón"
                autoFocus
              />
            </div>
            {cashCounted !== '' && (
              <p className="pay-change">
                {(parseFloat(cashCounted) || 0) < closeSummary.cashExpected ? 'Falta' : 'Sobra'}{' '}
                <strong>
                  {symbol}
                  {Math.abs((parseFloat(cashCounted) || 0) - closeSummary.cashExpected).toFixed(2)}
                </strong>
              </p>
            )}
            <div className="field">
              <label>Notas (opcional)</label>
              <textarea
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>
          </>
        ) : (
          <p className="muted">Cargando resumen…</p>
        )}
      </Modal>
    </>
  );
}
