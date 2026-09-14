import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
// electron-updater es CommonJS — bajo ESM ("type": "module" en package.json)
// no expone `autoUpdater` como named export, solo el default.
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;
// Mismo motivo que electron-updater: electron-log es CommonJS.
import electronLog from 'electron-log';
const log = electronLog;
import { backupDb } from '../server/db.js';

// Archivo real: <userData>/logs/main.log (Windows) — mismo userData que ya
// usa la app para el .db y el JWT secret. Es lo que se le pide al cliente
// ante un reclamo de soporte, en vez de depender de que describa el error.
log.transports.file.level = 'info';
log.transports.console.level = app.isPackaged ? false : 'info';

// Red de contención para lo que ningún try/catch puntual agarró — sin esto,
// un error en el proceso principal deja la app muerta sin ningún rastro.
process.on('uncaughtException', (err) => {
  log.error('uncaughtException', err);
});
process.on('unhandledRejection', (reason) => {
  log.error('unhandledRejection', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const PORT = 8001;

// El proceso de GPU de Chromium crashea en loop en máquinas con driver de
// video virtualizado/incompleto (visto en la práctica: STATUS_DLL_NOT_FOUND
// en bucle, ventana blanca para siempre). disableHardwareAcceleration() solo
// no alcanza — Chromium igual levanta un proceso de GPU aparte para el
// compositor por software. --in-process-gpu saca ese trabajo del proceso
// hijo (el que crashea) y lo mete adentro del proceso principal. Dibujar
// por software es un poco más lento, imperceptible para una app de gestión.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('in-process-gpu');

let mainWindow = null;
let stopServer = null;
let backupTimer = null;

const BACKUP_INTERVAL_MS = 60 * 60 * 1000;

function getUserDataPaths() {
  const root = path.join(app.getPath('userData'), 'POS');
  return {
    root,
    dbDir: path.join(root, 'server', 'databases'),
    dbFile: path.join(root, 'server', 'databases', 'pos.sqlite'),
    uploads: path.join(root, 'uploads'),
    localConfig: path.join(root, 'local-config.json'),
  };
}

function ensureDirs(paths) {
  fs.mkdirSync(paths.dbDir, { recursive: true });
  fs.mkdirSync(paths.uploads, { recursive: true });
}

function readLocalConfig(paths) {
  const defaults = {
    mode: 'Standalone Point of Sale',
    serverIp: '',
    till: 1,
    apiPort: PORT,
  };
  try {
    if (fs.existsSync(paths.localConfig)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(paths.localConfig, 'utf8')) };
    }
  } catch {
    /* ignore */
  }
  return defaults;
}

function writeLocalConfig(paths, config) {
  ensureDirs(paths);
  fs.writeFileSync(paths.localConfig, JSON.stringify(config, null, 2));
}

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function shouldStartServer(mode) {
  return (
    mode === 'Standalone Point of Sale' ||
    mode === 'Network Point of Sale Server'
  );
}

async function startApiServer(paths, mode) {
  if (!shouldStartServer(mode)) {
    return null;
  }

  const { createServer } = await import('../server/index.js');
  const host = mode === 'Network Point of Sale Server' ? '0.0.0.0' : '127.0.0.1';
  const expressApp = await createServer({
    dbPath: paths.dbFile,
    uploadsPath: paths.uploads,
    jwtSecret: app.getPath('userData') + '-store-pos-jwt',
  });

  const httpServer = await new Promise((resolve, reject) => {
    const server = expressApp.listen(PORT, host, () => {
      console.log(`POS API listening on ${host}:${PORT}`);
      resolve(server);
    });
    server.on('error', reject);
  });

  return () =>
    new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const iconPath = fs.existsSync(path.join(__dirname, '..', 'build', 'icon.ico'))
    ? path.join(__dirname, '..', 'build', 'icon.ico')
    : path.join(__dirname, '..', 'public', 'favicon.ico');
  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('get-paths', () => {
  const paths = getUserDataPaths();
  return {
    uploads: paths.uploads,
    userData: paths.root,
  };
});

ipcMain.handle('get-local-config', () => {
  const paths = getUserDataPaths();
  return readLocalConfig(paths);
});

ipcMain.handle('set-local-config', (_event, config) => {
  const paths = getUserDataPaths();
  const current = readLocalConfig(paths);
  const next = { ...current, ...config };
  writeLocalConfig(paths, next);
  return next;
});

ipcMain.handle('get-lan-ip', () => getLanIp());

ipcMain.handle('get-api-info', () => {
  const paths = getUserDataPaths();
  const config = readLocalConfig(paths);
  const isTerminal = config.mode === 'Network Point of Sale Terminal';
  const host = isTerminal ? config.serverIp || '127.0.0.1' : '127.0.0.1';
  return {
    baseUrl: `http://${host}:${config.apiPort || PORT}/api`,
    healthUrl: `http://${host}:${config.apiPort || PORT}/`,
    mode: config.mode,
    serverIp: config.serverIp,
    till: config.till,
    lanIp: getLanIp(),
    localServerRunning: shouldStartServer(config.mode),
  };
});

ipcMain.on('log-error', (_event, message, stack) => {
  log.error(message, stack || '');
});

ipcMain.on('app-quit', () => {
  app.quit();
});

ipcMain.on('app-reload', () => {
  if (mainWindow) mainWindow.reload();
});

// ── Actualizaciones ──────────────────────────────────────────────────────
// Pide confirmación antes de descargar (no baja sola apenas la detecta) y
// antes de instalar (el usuario elige cuándo reiniciar). El renderer se
// entera de cada paso vía 'update:*' y decide qué mostrar.
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

/**
 * En producción, el feed de actualizaciones es GitHub Releases (repo
 * privado) — así una app instalada en la compu de un cliente, sin nada
 * corriendo en la red del cliente ni en la nuestra, puede seguir
 * recibiendo las correcciones que subamos al repo.
 *
 * El token vive en `electron/private-config.json`, que NO se commitea
 * (ver .gitignore) — se crea una vez en la máquina que compila el
 * instalador, copiando `private-config.example.json`, y queda empaquetado
 * adentro del `.exe` resultante. Sin ese archivo (por ejemplo, en
 * `npm run dev`), se usa lo que diga `package.json → build.publish` —
 * hoy el servidor local de esta etapa de desarrollo.
 */
function configureUpdateFeed() {
  try {
    const configPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'electron', 'private-config.json')
      : path.join(__dirname, 'private-config.json');
    if (!fs.existsSync(configPath)) {
      if (app.isPackaged) {
        // Se armó el instalador sin electron/private-config.json — esta
        // copia va a quedar chequeando el servidor local de desarrollo
        // (package.json → build.publish), que no existe fuera de esta
        // compu. No es un error fatal, pero conviene que se note.
        console.error('private-config.json no encontrado — el auto-update va a usar el feed local de desarrollo, no GitHub.');
      }
      return;
    }
    const { updateToken } = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!updateToken) return;
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'EscencialConsult',
      repo: 'Minimercado-POS',
      private: true,
      token: updateToken,
    });
  } catch (err) {
    console.error('No se pudo configurar el feed de actualizaciones de GitHub', err);
  }
}
configureUpdateFeed();

function sendUpdate(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

autoUpdater.on('update-available', (info) => {
  sendUpdate('update:available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
  });
});
autoUpdater.on('update-not-available', () => sendUpdate('update:not-available'));
autoUpdater.on('download-progress', (p) => {
  sendUpdate('update:progress', { percent: p.percent, bytesPerSecond: p.bytesPerSecond });
});
autoUpdater.on('update-downloaded', (info) => {
  sendUpdate('update:downloaded', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
  });
});
autoUpdater.on('error', (err) => {
  // Sin token real de GitHub configurado para este cliente (o sin internet
  // en el momento), el chequeo automático falla siempre — no es un error
  // del sistema en sí, solo del feed de actualizaciones. Queda en el log
  // para diagnóstico de soporte, pero no interrumpe al usuario con un
  // cartel de error en cada arranque (ver UpdateNotifier.tsx).
  log.warn('Chequeo de actualizaciones falló', err?.message || err);
  sendUpdate('update:error', err?.message || String(err));
});

ipcMain.handle('update-check', async () => {
  // autoUpdater necesita la app empaquetada (lee app-update.yml de los
  // recursos) — en `npm run dev` no hay nada que chequear.
  if (!app.isPackaged) return { skipped: true, reason: 'dev' };
  try {
    await autoUpdater.checkForUpdates();
    return { skipped: false };
  } catch (err) {
    return { skipped: true, reason: err?.message || String(err) };
  }
});

ipcMain.handle('update-download', () => autoUpdater.downloadUpdate());
ipcMain.on('update-install', () => autoUpdater.quitAndInstall());

app.whenReady().then(async () => {
  const paths = getUserDataPaths();
  ensureDirs(paths);
  const config = readLocalConfig(paths);
  writeLocalConfig(paths, config);

  try {
    stopServer = await startApiServer(paths, config.mode);
  } catch (err) {
    console.error('Failed to start API server', err);
    log.error('Failed to start API server', err);
  }

  // Único punto que protege contra la pérdida total del histórico si el
  // .db activo se corrompe o el disco falla — copia rotativa, no depende
  // de que el cierre de caja o ninguna acción del usuario la dispare.
  if (shouldStartServer(config.mode)) {
    try {
      backupDb(paths.dbFile);
    } catch (err) {
      log.error('Backup inicial fallido', err);
    }
    backupTimer = setInterval(() => {
      try {
        backupDb(paths.dbFile);
      } catch (err) {
        log.error('Backup periódico fallido', err);
      }
    }, BACKUP_INTERVAL_MS);
  }

  createWindow();

  if (app.isPackaged) {
    // Un toque de margen para que la ventana ya esté mostrada antes de
    // avisar — si hay una actualización, el aviso aparece sobre la app
    // andando, no antes de que se vea nada.
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        /* sin conexión o sin servidor de updates corriendo — se reintenta en el próximo arranque */
      });
    }, 3000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function finalBackup() {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
  try {
    const paths = getUserDataPaths();
    backupDb(paths.dbFile);
  } catch (err) {
    log.error('Backup final fallido', err);
  }
}

app.on('window-all-closed', async () => {
  finalBackup();
  if (stopServer) {
    await stopServer();
    stopServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  finalBackup();
  if (stopServer) {
    await stopServer();
    stopServer = null;
  }
});
