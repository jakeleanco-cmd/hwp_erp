const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  runAgent: (data) => ipcRenderer.invoke('agent-action', data),
  openFile: () => ipcRenderer.invoke('open-file'),
});
