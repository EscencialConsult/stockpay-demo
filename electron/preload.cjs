const { contextBridge, ipcRenderer } = require('electron');

const UPDATE_EVENTS = ['update:available', 'update:not-available', 'update:progress', 'update:downloaded', 'update:error'];

contextBridge.exposeInMainWorld('pos', {
  getPaths: () => ipcRenderer.invoke('get-paths'),
  getLocalConfig: () => ipcRenderer.invoke('get-local-config'),
  setLocalConfig: (config) => ipcRenderer.invoke('set-local-config', config),
  getLanIp: () => ipcRenderer.invoke('get-lan-ip'),
  getApiInfo: () => ipcRenderer.invoke('get-api-info'),
  logError: (message, stack) => ipcRenderer.send('log-error', message, stack),
  quit: () => ipcRenderer.send('app-quit'),
  reload: () => ipcRenderer.send('app-reload'),

  checkForUpdate: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.send('update-install'),
  onUpdateEvent: (callback) => {
    const handlers = UPDATE_EVENTS.map((channel) => {
      const handler = (_event, payload) => callback(channel, payload);
      ipcRenderer.on(channel, handler);
      return { channel, handler };
    });
    return () => handlers.forEach(({ channel, handler }) => ipcRenderer.removeListener(channel, handler));
  },
});
