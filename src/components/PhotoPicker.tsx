import { useEffect, useState } from 'react';
import { api, getUploadsBase, MediaItem } from '../api/client';
import Modal from './Modal';

type Props = {
  value: string;
  onChange: (path: string) => void;
  suggestedQuery?: string;
  label?: string;
};

type Tab = 'library' | 'upload';

export default function PhotoPicker({ value, onChange, label = 'Foto' }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('library');
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploads = getUploadsBase();
  const previewSrc = value ? `${uploads}/${value}` : '';

  const loadLibrary = async () => {
    const items = await api.getMediaLibrary();
    setLibrary(items);
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    loadLibrary().catch((err) => setError(err.message));
  }, [open]);

  const uploadFile = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const item = await api.uploadMedia(file);
      await loadLibrary();
      onChange(item.path);
      setTab('library');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falló la subida');
    } finally {
      setBusy(false);
    }
  };

  const removeFromLibrary = async (id: number) => {
    if (!confirm('¿Quitar esta imagen de la biblioteca?')) return;
    await api.deleteMedia(id);
    await loadLibrary();
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div className="photo-picker">
        <button
          type="button"
          className={`photo-picker-preview ${value ? '' : 'empty'}`}
          onClick={() => setOpen(true)}
        >
          {value ? (
            <img src={previewSrc} alt="" />
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
                <circle cx="9" cy="10.5" r="1.6" />
                <path d="m5 16 4.5-4.5L12 14l3-3 4 4" />
              </svg>
              <span>Sin foto</span>
            </>
          )}
        </button>
        <div className="photo-picker-actions">
          <button type="button" className="b pri" onClick={() => setOpen(true)}>
            Elegir {label.toLowerCase()}
          </button>
          {value && (
            <button type="button" className="b fantasma" onClick={() => onChange('')}>
              Quitar
            </button>
          )}
        </div>
      </div>

      <Modal
        title="Biblioteca de fotos"
        open={open}
        onClose={() => setOpen(false)}
        wide
        footer={
          <button type="button" className="b" onClick={() => setOpen(false)}>
            Listo
          </button>
        }
      >
        <div className="tabs" style={{ border: 0, marginBottom: '0.85rem' }}>
          <button
            type="button"
            className={`tab ${tab === 'library' ? 'act' : ''}`}
            onClick={() => setTab('library')}
          >
            Biblioteca
          </button>
          <button
            type="button"
            className={`tab ${tab === 'upload' ? 'act' : ''}`}
            onClick={() => setTab('upload')}
          >
            Subir
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {tab === 'library' && (
          <div className="media-grid">
            {library.map((item) => (
              <div
                key={item.id}
                className={`media-tile ${value === item.path ? 'selected' : ''}`}
                onClick={() => onChange(item.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onChange(item.path);
                }}
                role="button"
                tabIndex={0}
              >
                <img src={`${uploads}/${item.path}`} alt={item.alt || ''} />
                <span>Subida</span>
                <button
                  type="button"
                  className="media-del"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromLibrary(item.id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {!library.length && (
              <div className="empty">La biblioteca está vacía — subí un archivo</div>
            )}
          </div>
        )}

        {tab === 'upload' && (
          <div className="field">
            <label>Subir imagen a la biblioteca</label>
            <input
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFile(file);
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
