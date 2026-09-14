import { useEffect, useState } from 'react';
import { getPosBridge } from '../bridge';
import type { UpdateEventName, UpdateInfo, UpdateProgress } from '../vite-env';
import Modal from './Modal';

const HISTORY_KEY = 'pos_update_history';
const DISMISSED_KEY = 'pos_update_dismissed_version';

/** Compara "2.3.10" > "2.3.9" numéricamente, no como texto (donde "2.3.10" < "2.3.9"). */
function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

function getDismissedVersion(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

function setDismissedVersion(version: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    /* localStorage puede fallar en un perfil restringido — no es crítico */
  }
}

type HistoryEntry = UpdateInfo & { downloadedAt: string };

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function pushHistory(entry: HistoryEntry) {
  try {
    const list = loadHistory();
    list.unshift(entry);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* localStorage puede fallar en un perfil restringido — no es crítico */
  }
}

type Phase = 'idle' | 'available' | 'downloading' | 'downloaded';

/**
 * Banner fijo de actualizaciones. Vive montado en toda la app (App.tsx),
 * afuera del login, porque una actualización se puede ofrecer aunque
 * todavía no haya nadie logueado.
 */
export default function UpdateNotifier() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const bridge = getPosBridge();
    const unsubscribe = bridge.onUpdateEvent((event: UpdateEventName, payload) => {
      if (event === 'update:available') {
        const data = payload as UpdateInfo;
        // Si ya se descartó esta misma versión, no se vuelve a interrumpir
        // — pero una versión más nueva sí avisa, aunque la anterior se
        // haya descartado.
        const dismissed = getDismissedVersion();
        if (dismissed && !isNewerVersion(data.version, dismissed)) return;
        setInfo(data);
        setPhase('available');
      } else if (event === 'update:progress') {
        setProgress(payload as UpdateProgress);
        setPhase('downloading');
      } else if (event === 'update:downloaded') {
        const data = payload as UpdateInfo;
        setInfo(data);
        setPhase('downloaded');
        pushHistory({ ...data, downloadedAt: new Date().toISOString() });
      }
      // 'update:error' y 'update:not-available' no muestran nada — el chequeo
      // de actualizaciones es un chequeo automático de fondo, no algo que el
      // usuario pidió. Si falla (sin token configurado, sin internet en el
      // momento), no tiene sentido interrumpirlo con un cartel de error en
      // cada arranque — el error ya queda en el log del proceso principal
      // (electron/main.js) para diagnóstico de soporte si hace falta.
    });
    bridge.checkForUpdate().catch(() => undefined);
    return unsubscribe;
  }, []);

  if (phase === 'idle') {
    return showHistory ? <HistoryModal onClose={() => setShowHistory(false)} /> : null;
  }

  return (
    <>
      <div className="update-banner">
        {phase === 'available' && info && (
          <>
            <strong>Actualización disponible</strong>
            <p>Versión {info.version} lista para bajar.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="b pri"
                onClick={() => getPosBridge().downloadUpdate()}
              >
                Descargar
              </button>
              <button type="button" className="b fantasma" onClick={() => setPhase('idle')}>
                Más tarde
              </button>
              <button
                type="button"
                className="b fantasma"
                onClick={() => {
                  setDismissedVersion(info.version);
                  setPhase('idle');
                }}
              >
                No volver a mostrar
              </button>
            </div>
          </>
        )}

        {phase === 'downloading' && (
          <>
            <strong>Descargando actualización…</strong>
            <div className="update-progress">
              <div
                className="update-progress-fill"
                style={{ width: `${Math.round(progress?.percent || 0)}%` }}
              />
            </div>
            <p className="muted">{Math.round(progress?.percent || 0)}%</p>
          </>
        )}

        {phase === 'downloaded' && info && (
          <>
            <strong>Versión {info.version} lista</strong>
            {info.releaseNotes && <p>{info.releaseNotes}</p>}
            <p className="muted">
              {info.releaseDate ? new Date(info.releaseDate).toLocaleString() : ''}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="b pri"
                onClick={() => getPosBridge().installUpdate()}
              >
                Reiniciar y actualizar
              </button>
              <button type="button" className="b fantasma" onClick={() => setPhase('idle')}>
                Después
              </button>
            </div>
          </>
        )}

        <button
          type="button"
          className="update-history-link"
          onClick={() => setShowHistory(true)}
        >
          Historial de actualizaciones
        </button>
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </>
  );
}

function HistoryModal({ onClose }: { onClose: () => void }) {
  const [history] = useState(loadHistory);
  return (
    <Modal title="Historial de actualizaciones" open onClose={onClose}>
      {!history.length && <div className="empty">Todavía no se instaló ninguna actualización.</div>}
      {history.map((h, i) => (
        <div key={i} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--line)' }}>
          <strong>Versión {h.version}</strong>
          <div className="muted" style={{ fontSize: '0.82rem' }}>
            Descargada el {new Date(h.downloadedAt).toLocaleString()}
          </div>
          {h.releaseNotes && <p style={{ margin: '0.35rem 0 0' }}>{h.releaseNotes}</p>}
        </div>
      ))}
    </Modal>
  );
}
