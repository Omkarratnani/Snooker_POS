import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
  });

  // Load the local server
  mainWindow.loadURL('http://localhost:5001');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app', 'server.mjs')
    : path.join(__dirname, '..', 'server.mjs');

  serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_PATH: app.isPackaged 
        ? path.join(app.getPath('userData'), 'database.sqlite')
        : path.join(__dirname, '..', 'database.sqlite')
    }
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server process.', err);
  });
}

app.whenReady().then(() => {
  startServer();
  
  // Wait a bit for the server to start before loading
  setTimeout(() => {
    createWindow();
  }, 1500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
