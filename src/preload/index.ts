/// <reference types="node" />
// @ts-nocheck - This is a CommonJS preload script for Electron
const { contextBridge, ipcRenderer } = require('electron');



contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
});
