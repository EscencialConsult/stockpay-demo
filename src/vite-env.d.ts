/// <reference types="vite/client" />

export type LocalConfig = {
  mode: string;
  serverIp: string;
  till: number;
  apiPort: number;
};

export type ApiInfo = {
  baseUrl: string;
  healthUrl: string;
  mode: string;
  serverIp: string;
  till: number;
  lanIp: string;
  localServerRunning: boolean;
};

export type UpdateInfo = {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
};

export type UpdateProgress = {
  percent: number;
  bytesPerSecond: number;
};

export type UpdateEventName =
  | 'update:available'
  | 'update:not-available'
  | 'update:progress'
  | 'update:downloaded'
  | 'update:error';

export type PosBridge = {
  getPaths: () => Promise<{ uploads: string; userData: string }>;
  getLocalConfig: () => Promise<LocalConfig>;
  setLocalConfig: (config: Partial<LocalConfig>) => Promise<LocalConfig>;
  getLanIp: () => Promise<string>;
  getApiInfo: () => Promise<ApiInfo>;
  /** Manda un error del renderer al log persistente del proceso principal (<userData>/logs/main.log). */
  logError: (message: string, stack?: string) => void;
  quit: () => void;
  reload: () => void;

  checkForUpdate: () => Promise<{ skipped: boolean; reason?: string }>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => void;
  /** Se suscribe a los eventos de actualización. Devuelve una función para desuscribirse. */
  onUpdateEvent: (
    callback: (event: UpdateEventName, payload?: UpdateInfo | UpdateProgress | string) => void
  ) => () => void;
};

declare global {
  interface Window {
    pos: PosBridge;
  }
  /** Versión de package.json, inyectada por vite.config.ts en build time. */
  const __APP_VERSION__: string;
}

export {};
