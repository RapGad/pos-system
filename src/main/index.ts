import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from './database/migrator.js';
import { registerAuthHandlers } from './ipc/auth.js';
import { registerProductHandlers } from './ipc/products.js';
import { registerSalesHandlers } from './ipc/sales.js';
import { registerReportHandlers } from './ipc/reports.js';
import { registerPrinterHandlers } from './ipc/printer.js';
import { registerBackupHandlers } from './ipc/backup.js';
import { registerSettingsHandlers } from './ipc/settings.js';
import { initAutoBackup } from './services/backup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Run migrations on startup
runMigrations();

// Init auto-backup
initAutoBackup();

// Register IPC handlers
registerAuthHandlers();
registerProductHandlers();
registerSalesHandlers();
registerReportHandlers();
registerPrinterHandlers();
registerBackupHandlers();
registerSettingsHandlers();

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Disable autofill features in DevTools to prevent harmless error messages
app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication');
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');

// Filter console output to suppress autofill-related errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
    return; // Suppress these specific errors
  }
  originalConsoleError.apply(console, args);
};

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    splashWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}/splash.html`);
  } else {
    splashWindow.loadFile(path.join(__dirname, '../renderer/splash.html'));
  }
};

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show the main window until it's ready
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Test IPC
  ipcMain.handle('ping', () => 'pong');

  // Load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.OPEN_DEVTOOLS === 'true') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // When the main window is ready to be shown, close the splash screen and show the main window
  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow?.show();
    mainWindow?.maximize();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createSplashWindow();
  createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
