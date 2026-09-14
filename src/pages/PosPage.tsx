import { useEffect, useMemo, useState } from 'react';
import {
  api,
  Category,
  Customer,
  Product,
  Settings,
  Transaction,
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppShell, { NavView } from '../layout/AppShell';
import TillView from './TillView';
import CatalogView from './CatalogView';
import SettingsView from './SettingsView';
import OnboardingWizard from './OnboardingWizard';
import TransactionsModal from '../components/TransactionsModal';
import ClosuresView from './ClosuresView';
import Modal from '../components/Modal';
import Selector from '../components/Selector';
import MenuAcciones from '../components/MenuAcciones';
import { MENU, VIEW_TITLES } from '../config/menu';
import { PRODUCT_NAME } from '../config/textos';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PERM_TEMPLATE, Role, Perms } from '../config/roles';
import { MEDIOS_DE_TODOS_LOS_DIAS, OTROS_MEDIOS, etiquetaMedio } from '../config/pagos';

export default function PosPage() {
  const { hasPerm, apiInfo } = useAuth();
  const [view, setView] = useState<NavView>('till');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);

  const symbol = settings?.symbol || '$';

  const loadAll = async () => {
    const [p, c, cust, s] = await Promise.all([
      api.getProducts(),
      api.getCategories(),
      api.getCustomers(),
      api.getSettings(),
    ]);
    setProducts(p);
    setCategories(c);
    setCustomers(cust);
    setSettings(s.settings);

    if (hasPerm('perm_transactions')) {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const sales = await api.getByDate({
          start: start.toISOString(),
          end: new Date().toISOString(),
          user: 0,
          till: 0,
          status: 1,
        });
        setTodayTotal(sales.reduce((sum: number, t: Transaction) => sum + Number(t.total || 0), 0));
      } catch {
        /* cashiers without perm already filtered */
      }
    }
  };

  useEffect(() => {
    loadAll().catch((err) => setError(err.message));
  }, []);

  const needsOnboarding = settings !== null && !settings.store && hasPerm('perm_settings');

  const title = useMemo(() => {
    if (view === 'till' && settings?.store) return `${settings.store} · Caja`;
    return VIEW_TITLES[view] || PRODUCT_NAME;
  }, [view, settings]);

  if (needsOnboarding) {
    return <OnboardingWizard onDone={loadAll} />;
  }

  return (
    <AppShell
      view={view}
      onNavigate={setView}
      title={title}
      logo={settings?.img || ''}
      todaySales={
        hasPerm('perm_transactions')
          ? `${symbol}${todayTotal.toFixed(2)}`
          : undefined
      }
    >
      {error && (
        <div className="error">
          {error}{' '}
          <button type="button" className="b fantasma" onClick={() => setError(null)}>
            descartar
          </button>
        </div>
      )}

      {view === 'till' && (
        <TillView
          products={products}
          categories={categories}
          customers={customers}
          settings={settings}
          onRefresh={loadAll}
        />
      )}

      {view === 'catalog' && (
        <CatalogView
          products={products}
          categories={categories}
          symbol={symbol}
          canProducts={hasPerm('perm_products')}
          canCategories={hasPerm('perm_categories')}
          onChanged={loadAll}
        />
      )}

      {view === 'sales' && (
        <TransactionsModal
          embedded
          open
          symbol={symbol}
          onClose={() => setView('till')}
        />
      )}

      {view === 'closures' && <ClosuresView symbol={symbol} />}

      {view === 'customers' && (
        <CustomersView
          customers={customers}
          symbol={symbol}
          onChanged={loadAll}
          till={apiInfo?.till || 1}
        />
      )}

      {view === 'team' && <TeamView />}

      {view === 'settings' && (
        <SettingsView settings={settings} onSaved={loadAll} />
      )}
    </AppShell>
  );
}

function CustomersView({
  customers,
  symbol,
  onChanged,
  till,
}: {
  customers: Customer[];
  symbol: string;
  onChanged: () => Promise<void>;
  till: number;
}) {
  // Reuse modal body as always-open panel by rendering CustomersModal embedded-style
  return (
    <CustomersPanel customers={customers} symbol={symbol} onChanged={onChanged} till={till} />
  );
}

/** Medios válidos para cobrar una deuda — cuenta corriente queda afuera: no tendría sentido "fiar el pago de lo fiado". */
const MEDIOS_COBRO_CUENTA = [...MEDIOS_DE_TODOS_LOS_DIAS, ...OTROS_MEDIOS].filter(
  (m) => m.etiqueta !== 'Cuenta corriente'
);

function CustomersPanel({
  customers,
  symbol,
  onChanged,
  till,
}: {
  customers: Customer[];
  symbol: string;
  onChanged: () => Promise<void>;
  till: number;
}) {
  const [list, setList] = useState(customers);
  const [form, setForm] = useState({
    id: '',
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [cuenta, setCuenta] = useState<Customer | null>(null);
  const [pagoImporte, setPagoImporte] = useState('');
  const [pagoMedio, setPagoMedio] = useState(1);
  const [pagoNotas, setPagoNotas] = useState('');
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [pagoBusy, setPagoBusy] = useState(false);
  const [detalle, setDetalle] = useState<Customer | null>(null);
  const [movimientos, setMovimientos] = useState<Awaited<ReturnType<typeof api.getCustomerAccount>> | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);

  useEffect(() => setList(customers), [customers]);

  const abrirCobroCuenta = (c: Customer) => {
    setCuenta(c);
    setPagoImporte('');
    setPagoMedio(1);
    setPagoNotas('');
    setPagoError(null);
  };

  const abrirDetalle = async (c: Customer) => {
    setDetalle(c);
    setMovimientos(null);
    setDetalleError(null);
    try {
      setMovimientos(await api.getCustomerAccount(c.id));
    } catch (err) {
      setDetalleError(err instanceof Error ? err.message : 'No se pudo cargar el detalle');
    }
  };

  const registrarPago = async () => {
    if (!cuenta) return;
    const amount = parseFloat(pagoImporte) || 0;
    if (amount <= 0) {
      setPagoError('El importe tiene que ser mayor que cero');
      return;
    }
    setPagoBusy(true);
    setPagoError(null);
    try {
      await api.payCustomerAccount(cuenta.id, amount, pagoNotas, till, pagoMedio);
      setCuenta(null);
      await onChanged();
    } catch (err) {
      setPagoError(err instanceof Error ? err.message : 'No se pudo registrar el pago');
    } finally {
      setPagoBusy(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (form.id) {
      await api.updateCustomer({
        _id: form.id,
        id: Number(form.id),
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
      });
    } else {
      await api.saveCustomer({
        name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
      });
    }
    setForm({ id: '', name: '', phone: '', email: '', address: '' });
    await onChanged();
  };

  const remove = async (id: number) => {
    if (!confirm('¿Eliminar cliente?')) return;
    await api.deleteCustomer(id);
    await onChanged();
  };

  return (
    <div className="page-grid">
      <div className="panel" style={{ padding: '1rem' }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>
          {form.id ? 'Editar cliente' : 'Nuevo cliente'}
        </h3>
        <div className="field">
          <label>Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Teléfono</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Dirección</label>
          <textarea
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </div>
        <button type="button" className="b pri" onClick={save}>
          {form.id ? 'Actualizar' : 'Agregar'} cliente
        </button>
      </div>
      <div className="panel" style={{ padding: '1rem' }}>
        <div className="t-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th className="d">Cuenta corriente</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.phone}</td>
                  <td className="d">
                    {c.balance > 0 ? (
                      <span className="recuadro bad">
                        Debe {symbol}
                        {c.balance.toFixed(2)}
                      </span>
                    ) : (
                      <span className="muted">Sin saldo</span>
                    )}
                  </td>
                  <td>
                    <MenuAcciones
                      label={`Acciones para ${c.name}`}
                      acciones={[
                        {
                          label: 'Editar',
                          onClick: () =>
                            setForm({
                              id: String(c.id),
                              name: c.name,
                              phone: c.phone,
                              email: c.email,
                              address: c.address,
                            }),
                        },
                        { label: 'Ver movimientos', onClick: () => abrirDetalle(c) },
                        ...(c.balance > 0
                          ? [{ label: 'Cobrar cuenta', onClick: () => abrirCobroCuenta(c) }]
                          : []),
                        { label: 'Borrar', onClick: () => remove(c.id), malo: true },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        title={`Cobrar cuenta — ${cuenta?.name || ''}`}
        open={!!cuenta}
        onClose={() => setCuenta(null)}
        compact
        footer={
          <>
            <button type="button" className="b" onClick={() => setCuenta(null)}>
              Cancelar
            </button>
            <button type="button" className="b pri" onClick={registrarPago} disabled={pagoBusy}>
              {pagoBusy ? 'Guardando…' : 'Registrar pago'}
            </button>
          </>
        }
      >
        {pagoError && <div className="error">{pagoError}</div>}
        <p className="pay-due" style={{ marginTop: 0 }}>
          Debe {symbol}
          {(cuenta?.balance || 0).toFixed(2)}
        </p>
        <div className="field">
          <label>Importe que paga ahora</label>
          <input
            value={pagoImporte}
            onChange={(e) => setPagoImporte(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
          />
        </div>
        <div className="field">
          <label>Cómo paga</label>
          <Selector
            value={String(pagoMedio)}
            onChange={(v) => setPagoMedio(Number(v))}
            options={MEDIOS_COBRO_CUENTA.map((m) => ({ value: String(m.valor), label: m.etiqueta }))}
          />
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
            Esta plata entra a la caja de hoy — el cierre de caja la va a contar junto con las demás ventas.
          </p>
        </div>
        <div className="field">
          <label>Notas (opcional)</label>
          <input value={pagoNotas} onChange={(e) => setPagoNotas(e.target.value)} />
        </div>
      </Modal>

      <Modal
        title={`Movimientos — ${detalle?.name || ''}`}
        open={!!detalle}
        onClose={() => setDetalle(null)}
      >
        {detalleError && <div className="error">{detalleError}</div>}
        {!detalleError && !movimientos && <div className="empty">Cargando…</div>}
        {movimientos && (
          <>
            <p className="pay-due" style={{ marginTop: 0 }}>
              Debe {symbol}
              {movimientos.balance.toFixed(2)}
            </p>
            {!movimientos.movements.length && <div className="empty">Todavía no tiene movimientos.</div>}
            {!!movimientos.movements.length && (
              <div className="t-wrap">
                <table className="t">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th className="d">Medio</th>
                      <th>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.movements.map((m) => (
                      <tr key={m.id}>
                        <td>{new Date(m.date).toLocaleString()}</td>
                        <td>{m.type === 'venta' ? 'Venta a cuenta' : 'Pago recibido'}</td>
                        <td className="d">{m.type === 'pago' ? etiquetaMedio(m.payment_type) : '—'}</td>
                        <td>
                          {m.type === 'venta' ? '+' : '-'}
                          {symbol}
                          {m.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

function TeamView() {
  return <UsersPanel />;
}

const emptyUserForm = {
  id: '',
  username: '',
  password: '',
  fullname: '',
  role: 'cajero' as Role,
  ...ROLE_PERM_TEMPLATE.cajero,
};

/**
 * Etiqueta de cada switch — un solo lugar, en el mismo orden en que se
 * muestran. El resumen de la tabla (¿qué tiene habilitado cada persona?)
 * usa en cambio MENU/VIEW_TITLES, para no mantener dos textos distintos
 * para la misma pantalla.
 */
const PERM_FIELDS: { key: keyof Perms; label: string }[] = [
  { key: 'perm_products', label: 'Ver y editar catálogo' },
  { key: 'perm_categories', label: 'Ver y editar categorías' },
  { key: 'perm_transactions', label: 'Ver ventas y cerrar caja' },
  { key: 'perm_users', label: 'Gestionar equipo (usuarios)' },
  { key: 'perm_settings', label: 'Configuración del negocio' },
];

/** Pantallas habilitadas para un usuario, en texto corto — mismo criterio que arma el menú lateral (MENU). */
function pantallasHabilitadas(u: { perm_products: number | boolean; perm_categories: number | boolean; perm_transactions: number | boolean; perm_users: number | boolean; perm_settings: number | boolean }): string {
  const nombres = MENU.filter((item) => {
    if (!item.perm) return true;
    const perms = Array.isArray(item.perm) ? item.perm : [item.perm];
    return perms.some((p) => !!(u as Record<string, number | boolean>)[p]);
  }).map((item) => VIEW_TITLES[item.id]);
  return nombres.join(', ');
}

function UsersPanel() {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.getUsers>>>([]);
  const [form, setForm] = useState(emptyUserForm);
  const [error, setError] = useState<string | null>(null);

  const load = async () => setList(await api.getUsers());

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  /** Cambiar el rol de un usuario NUEVO reacomoda los 5 switches a su
   * plantilla — en uno ya existente el rol es solo una etiqueta, sus
   * permisos reales no se tocan solo por cambiar el rol. */
  const cambiarRol = (rol: Role) => {
    if (form.id) {
      setForm({ ...form, role: rol });
    } else {
      setForm({ ...form, role: rol, ...ROLE_PERM_TEMPLATE[rol] });
    }
  };

  const save = async () => {
    setError(null);
    if (!form.username.trim() || !form.fullname.trim()) {
      setError('Usuario y nombre completo son obligatorios');
      return;
    }
    if (!form.id && !form.password) {
      setError('La contraseña es obligatoria para usuarios nuevos');
      return;
    }
    try {
      await api.saveUser({ ...form });
      await load();
      setForm(emptyUserForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar');
    }
  };

  return (
    <div className="page-grid">
      <div className="panel" style={{ padding: '1rem' }}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>
          {form.id ? 'Editar usuario' : 'Nuevo usuario'}
        </h3>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Usuario</label>
          <input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Nombre completo</label>
          <input
            value={form.fullname}
            onChange={(e) => setForm({ ...form, fullname: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Contraseña {form.id ? '(vacío = sin cambios)' : ''}</label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Rol</label>
          <Selector
            value={form.role}
            onChange={(v) => cambiarRol(v as Role)}
            disabled={form.id === '1'}
            options={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
          />
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>
            {form.id
              ? 'El rol es una etiqueta — lo que puede hacer esta persona lo deciden los switches de abajo.'
              : ROLE_DESCRIPTIONS[form.role]}
          </p>
        </div>
        <div className="field">
          <label>Qué puede ver y hacer</label>
          {PERM_FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`perm-switch ${form[key] ? 'on' : ''}`}
              role="switch"
              aria-checked={form[key]}
              disabled={form.id === '1'}
              onClick={() => setForm({ ...form, [key]: !form[key] })}
            >
              <span className="riel" aria-hidden="true">
                <span className="bolita" />
              </span>
              {label}
            </button>
          ))}
        </div>
        <button type="button" className="b pri" onClick={save} style={{ marginTop: '0.75rem' }}>
          {form.id ? 'Actualizar' : 'Agregar'} usuario
        </button>
      </div>
      <div className="panel" style={{ padding: '1rem' }}>
        <div className="t-wrap">
          <table className="t">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th className="d">Tiene habilitado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.fullname}</td>
                  <td>{ROLE_LABELS[u.role as Role] || u.role}</td>
                  <td className="d perm-summary">{pantallasHabilitadas(u) || 'Nada'}</td>
                  <td>
                    <button
                      type="button"
                      className="mini"
                      onClick={() =>
                        setForm({
                          id: String(u.id),
                          username: u.username,
                          password: '',
                          fullname: u.fullname,
                          role: (u.role as Role) || 'cajero',
                          perm_products: !!u.perm_products,
                          perm_categories: !!u.perm_categories,
                          perm_transactions: !!u.perm_transactions,
                          perm_users: !!u.perm_users,
                          perm_settings: !!u.perm_settings,
                        })
                      }
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
