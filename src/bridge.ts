import type { ApiInfo, LocalConfig, PosBridge } from './vite-env';

const FALLBACK_PORT = 8001;

function browserFallback(): PosBridge {
  const storageKey = 'pos_local_config';

  const readConfig = (): LocalConfig => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return { ...defaults(), ...JSON.parse(raw) };
    } catch {
      /* ignore */
    }
    return defaults();
  };

  const defaults = (): LocalConfig => ({
    mode: 'Standalone Point of Sale',
    serverIp: '',
    till: 1,
    apiPort: FALLBACK_PORT,
  });

  return {
    getPaths: async () => ({ uploads: '', userData: '' }),
    getLocalConfig: async () => readConfig(),
    setLocalConfig: async (config) => {
      const next = { ...readConfig(), ...config };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    },
    getLanIp: async () => '127.0.0.1',
    // Demo web: siempre habla con /api relativo (Vite lo proxea a
    // localhost:8001 en desarrollo, Netlify lo proxea al backend real en
    // producción — ver netlify.toml). No hay "modo terminal de red" acá,
    // esto no es la app de escritorio: es una sola instancia pública.
    getApiInfo: async () => {
      const config = readConfig();
      const info: ApiInfo = {
        baseUrl: `/api`,
        healthUrl: `/api/health`,
        mode: config.mode,
        serverIp: config.serverIp,
        till: config.till,
        lanIp: '127.0.0.1',
        localServerRunning: true,
      };
      return info;
    },
    // Sin Electron no hay proceso principal ni archivo de log — el navegador
    // ya tiene su propia consola, así que ahí queda.
    logError: (message, stack) => {
      console.error(message, stack || '');
    },
    quit: () => {
      window.close();
    },
    reload: () => {
      window.location.reload();
    },

    // Sin Electron no hay proceso principal que chequee versiones — el modo
    // navegador se queda siempre "al día" por definición.
    checkForUpdate: async () => ({ skipped: true, reason: 'browser' }),
    downloadUpdate: async () => undefined,
    installUpdate: () => undefined,
    onUpdateEvent: () => () => undefined,
  };
}

export function getPosBridge(): PosBridge {
  if (typeof window !== 'undefined' && window.pos) {
    return window.pos;
  }
  return browserFallback();
}

export function isElectronBridge(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pos);
}
