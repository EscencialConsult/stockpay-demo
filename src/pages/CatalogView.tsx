import { useEffect, useState } from 'react';
import { api, Category, Product, getUploadsBase } from '../api/client';
import PhotoPicker from '../components/PhotoPicker';
import Selector from '../components/Selector';
import MenuAcciones from '../components/MenuAcciones';
import PrintLabel from '../components/PrintLabel';
import { sanitizeDecimal, sanitizeInteger } from '../lib/numericInput';

type Props = {
  products: Product[];
  categories: Category[];
  symbol: string;
  canProducts: boolean;
  canCategories: boolean;
  onChanged: () => Promise<void>;
};

const emptyProduct = {
  id: '',
  name: '',
  price: '',
  category: '',
  quantity: '0',
  trackStock: true,
  img: '',
  code: '',
};

export default function CatalogView({
  products,
  categories,
  symbol,
  canProducts,
  canCategories,
  onChanged,
}: Props) {
  const [tab, setTab] = useState<'products' | 'categories'>(
    canProducts ? 'products' : 'categories'
  );
  const [list, setList] = useState(products);
  const [cats, setCats] = useState(categories);
  const [form, setForm] = useState(emptyProduct);
  const [catName, setCatName] = useState('');
  const [editCatId, setEditCatId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const uploads = getUploadsBase();

  useEffect(() => {
    setList(products);
    setCats(categories);
    setSelected((prev) => prev.filter((id) => products.some((p) => p.id === id)));
  }, [products, categories]);

  const saveProduct = async () => {
    if (!form.name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.append('id', form.id);
    fd.append('name', form.name.trim());
    fd.append('price', form.price || '0');
    fd.append('category', form.category);
    fd.append('quantity', form.quantity || '0');
    fd.append('stock', form.trackStock ? '1' : 'on');
    fd.append('img', form.img);
    fd.append('code', form.code.trim());
    await api.saveProduct(fd);
    setForm(emptyProduct);
    await onChanged();
  };

  const editProduct = (p: Product) => {
    setForm({
      id: String(p.id),
      name: p.name,
      price: String(p.price),
      category: p.category,
      quantity: String(p.quantity),
      trackStock: !!p.stock,
      img: p.img || '',
      code: p.code || '',
    });
    setTab('products');
  };

  const removeProduct = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    await api.deleteProduct(id);
    await onChanged();
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const visible = list.filter(
    (p) =>
      !filter ||
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(filter.toLowerCase()) ||
      String(p.id).includes(filter)
  );

  const allVisibleSelected =
    visible.length > 0 && visible.every((p) => selected.includes(p.id));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(visible.map((p) => p.id));
      setSelected((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      setSelected((prev) => Array.from(new Set([...prev, ...visible.map((p) => p.id)])));
    }
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!confirm(`¿Eliminar ${selected.length} producto(s) seleccionado(s)?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteProducts(selected);
      setSelected([]);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló el borrado masivo');
    } finally {
      setBusy(false);
    }
  };

  const seedDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.seedDemo();
      await onChanged();
      alert(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la carga de datos de ejemplo');
    } finally {
      setBusy(false);
    }
  };

  const saveCategory = async () => {
    if (!catName.trim()) return;
    if (editCatId) {
      await api.updateCategory({ id: editCatId, name: catName.trim() });
    } else {
      await api.saveCategory({ name: catName.trim() });
    }
    setCatName('');
    setEditCatId(null);
    await onChanged();
  };

  const removeCategory = async (id: number) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    await api.deleteCategory(id);
    await onChanged();
  };

  return (
    <div>
      <div className="tabs" style={{ border: 0, borderRadius: 'var(--rad)', marginBottom: '1rem' }}>
        {canProducts && (
          <button
            type="button"
            className={`tab ${tab === 'products' ? 'act' : ''}`}
            onClick={() => setTab('products')}
          >
            Productos
          </button>
        )}
        {canCategories && (
          <button
            type="button"
            className={`tab ${tab === 'categories' ? 'act' : ''}`}
            onClick={() => setTab('categories')}
          >
            Categorías
          </button>
        )}
        {canProducts && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button type="button" className="b" disabled={busy} onClick={seedDemo}>
              Cargar datos de ejemplo
            </button>
            <button
              type="button"
              className="b malo"
              disabled={busy || !selected.length}
              onClick={bulkDelete}
            >
              Eliminar seleccionados ({selected.length})
            </button>
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {tab === 'products' && canProducts && (
        <div className="page-grid">
          <div className="panel" style={{ padding: '1rem' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>
              {form.id ? 'Editar producto' : 'Nuevo producto'}
            </h3>
            <div className="field">
              <label>Nombre</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Precio</label>
              <input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: sanitizeDecimal(e.target.value) })}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
            <div className="field">
              <label>Categoría</label>
              <Selector
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                placeholder="Sin categoría"
                options={[{ value: '', label: 'Sin categoría' }, ...cats.map((c) => ({ value: c.name, label: c.name }))]}
              />
            </div>
            <div className="field">
              <label>Código de barras</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Escaneá o dejalo vacío para generar uno"
              />
              <p className="muted" style={{ fontSize: '0.78rem', margin: '0.3rem 0 0' }}>
                Si el producto ya trae un código de fábrica, escaneálo o tipealo acá. Si no
                tiene, dejalo vacío — al guardar se genera uno propio, listo para imprimir.
              </p>
            </div>
            <label
              style={{
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                marginBottom: '0.75rem',
              }}
            >
              <input
                type="checkbox"
                checked={form.trackStock}
                onChange={(e) => setForm({ ...form, trackStock: e.target.checked })}
              />
              Controlar inventario
            </label>
            {form.trackStock && (
              <div className="field">
                <label>Cantidad disponible</label>
                <input
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: sanitizeInteger(e.target.value) })}
                  inputMode="numeric"
                />
              </div>
            )}
            <PhotoPicker
              value={form.img}
              onChange={(img) => setForm({ ...form, img })}
              suggestedQuery={form.name || form.category}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="b pri" onClick={saveProduct}>
                {form.id ? 'Actualizar' : 'Agregar'} producto
              </button>
              {form.id && (
                <button type="button" className="b" onClick={() => setForm(emptyProduct)}>
                  Cancelar
                </button>
              )}
            </div>
          </div>

          <div className="panel" style={{ padding: '1rem' }}>
            <div className="field">
              <label>Buscar en el catálogo</label>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Nombre, categoría o ID"
              />
            </div>
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        title="Seleccionar todos los visibles"
                        aria-label="Seleccionar todos los visibles"
                      />
                    </th>
                    <th />
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Código</th>
                    <th className="d">Precio</th>
                    <th className="d">Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          aria-label={`Seleccionar ${p.name}`}
                        />
                      </td>
                      <td>
                        {p.img ? (
                          <img
                            src={`${uploads}/${p.img}`}
                            alt=""
                            style={{
                              width: 40,
                              height: 40,
                              objectFit: 'cover',
                              borderRadius: 6,
                              border: '1px solid var(--line)',
                            }}
                          />
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td className="cod">{p.id}</td>
                      <td>
                        <div>{p.name}</div>
                        <div className="muted" style={{ fontSize: '0.8rem', marginTop: '0.15rem' }}>
                          {p.category || 'Sin categoría'}
                        </div>
                      </td>
                      <td className="cod">{p.code}</td>
                      <td className="d">
                        {symbol}
                        {Number(p.price).toFixed(2)}
                      </td>
                      <td className="d">{p.stock ? p.quantity : '—'}</td>
                      <td>
                        <MenuAcciones
                          label={`Acciones para ${p.name}`}
                          acciones={[
                            { label: 'Editar', onClick: () => editProduct(p) },
                            { label: 'Imprimir etiqueta', onClick: () => setLabelProduct(p) },
                            { label: 'Borrar', onClick: () => removeProduct(p.id), malo: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && <div className="empty">Todavía no hay productos</div>}
          </div>
        </div>
      )}

      {tab === 'categories' && canCategories && (
        <div className="page-grid">
          <div className="panel" style={{ padding: '1rem' }}>
            <h3 style={{ marginTop: 0, fontFamily: 'var(--titulo)' }}>
              {editCatId ? 'Editar categoría' : 'Nueva categoría'}
            </h3>
            <div className="field">
              <label>Nombre</label>
              <input value={catName} onChange={(e) => setCatName(e.target.value)} />
            </div>
            <button type="button" className="b pri" onClick={saveCategory}>
              {editCatId ? 'Actualizar' : 'Agregar'} categoría
            </button>
          </div>
          <div className="panel" style={{ padding: '1rem' }}>
            <div className="t-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td>
                        <MenuAcciones
                          label={`Acciones para ${c.name}`}
                          acciones={[
                            {
                              label: 'Editar',
                              onClick: () => {
                                setEditCatId(c.id);
                                setCatName(c.name);
                              },
                            },
                            { label: 'Borrar', onClick: () => removeCategory(c.id), malo: true },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <PrintLabel product={labelProduct} symbol={symbol} onDone={() => setLabelProduct(null)} />
    </div>
  );
}

