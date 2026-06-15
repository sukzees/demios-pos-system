const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  printSilent: (html, printerName) => ipcRenderer.invoke('print-silent', html, printerName),
  isElectron: true,
});
