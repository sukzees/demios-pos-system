const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Check if running in development
const isDev = !app.isPackaged;

let mainWindow;
let nextServer;
const PORT = 3000;

// Start Next.js standalone server
function startNextServer() {
  return new Promise((resolve) => {
    if (isDev) {
      console.log('[Electron] Development mode - expecting dev server at localhost:3000');
      setTimeout(resolve, 1000);
      return;
    }

    console.log('[Electron] Starting Next.js standalone server...');
    
    // Path to standalone server
    const serverPath = path.join(process.resourcesPath, 'app', 'server.js');
    const appDir = path.join(process.resourcesPath, 'app');
    
    console.log('[Electron] Server path:', serverPath);
    console.log('[Electron] App dir:', appDir);
    console.log('[Electron] Resources path:', process.resourcesPath);
    
    // Start Next.js standalone server
    try {
      nextServer = spawn('node', [serverPath], {
        env: { 
          ...process.env, 
          NODE_ENV: 'production',
          PORT: String(PORT),
          HOSTNAME: 'localhost'
        },
        cwd: appDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      nextServer.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Next.js] ${output}`);
        
        // Check if server is ready
        if (output.includes('Ready') || output.includes('started server') || output.includes(`localhost:${PORT}`)) {
          console.log('[Electron] Server is ready!');
          resolve(true);
        }
      });

      nextServer.stderr.on('data', (data) => {
        const output = data.toString();
        console.error(`[Next.js Error] ${output}`);
      });

      nextServer.on('error', (error) => {
        console.error('[Electron] Failed to start server:', error);
        resolve(false);
      });

      nextServer.on('exit', (code, signal) => {
        console.log(`[Electron] Server exited with code ${code} and signal ${signal}`);
      });

      // Fallback timeout
      setTimeout(() => {
        console.log('[Electron] Server startup timeout, continuing anyway...');
        resolve(true);
      }, 10000);
      
    } catch (error) {
      console.error('[Electron] Error starting server:', error);
      setTimeout(() => resolve(false), 1000);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icons/icon.ico'),
    title: 'POS System',
    backgroundColor: '#ffffff',
    show: false,
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load from localhost
  const loadURL = `http://localhost:${PORT}`;
  console.log('[Electron] Loading URL:', loadURL);
  mainWindow.loadURL(loadURL);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Log any errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription);
    
    // Show loading page
    mainWindow.loadURL(`data:text/html;charset=utf-8,
      <html>
        <head>
          <title>Loading POS System...</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 0;
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              max-width: 500px;
              background: white;
              padding: 50px;
              border-radius: 20px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              text-align: center;
            }
            h1 { 
              color: #333; 
              margin: 0 0 20px 0;
              font-size: 28px;
            }
            p { 
              color: #666; 
              line-height: 1.8;
              margin: 15px 0;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 30px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .status {
              font-size: 14px;
              color: #999;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Starting POS System</h1>
            <div class="spinner"></div>
            <p>กำลังเริ่มต้นระบบ...</p>
            <p>Please wait while the application is loading.</p>
            <p class="status">This may take a few moments on first launch.</p>
          </div>
          <script>
            // Auto-retry every 2 seconds
            setTimeout(() => location.reload(), 2000);
          </script>
        </body>
      </html>
    `);
  });

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Full Screen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About POS System',
              message: 'POS System v1.0.0',
              detail: 'Restaurant Point of Sale System\n\nDeveloped with Next.js and Electron',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.on('ready', async () => {
  console.log('[Electron] App is ready');
  console.log('[Electron] isDev:', isDev);
  console.log('[Electron] App path:', app.getAppPath());
  console.log('[Electron] Resources path:', process.resourcesPath);
  
  // Start server first
  await startNextServer();
  
  // Then create window
  createWindow();
});

app.on('window-all-closed', () => {
  // Kill Next.js server when app closes
  if (nextServer) {
    console.log('[Electron] Killing Next.js server...');
    nextServer.kill();
  }
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  // Kill Next.js server on quit
  if (nextServer) {
    nextServer.kill();
  }
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

// IPC Handler for silent printing
// Writes HTML to a temp file and loads via file:// to avoid data: URL length limits
// (large base64 QR images get truncated in data: URLs on Windows/Electron).
ipcMain.handle('print-silent', async (event, html, printerName) => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  let printWindow;
  let tempFile = '';
  try {
    // Write HTML to temp file so base64 images are not truncated by data: URL limits
    const tempDir = os.tmpdir();
    tempFile = path.join(tempDir, `print-${Date.now()}.html`);
    fs.writeFileSync(tempFile, html, 'utf8');

    printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadFile(tempFile);

    // Wait for all images (especially QR base64 data URLs) to fully decode before printing
    await printWindow.webContents.executeJavaScript(`
      (async () => {
        const imgs = document.querySelectorAll('img');
        if (imgs.length > 0) {
          await Promise.allSettled(Array.from(imgs).map(async (img) => {
            try {
              if (typeof img.decode === 'function') {
                await img.decode();
              } else {
                await new Promise((resolve) => {
                  if (img.complete && img.naturalWidth > 0) { resolve(); return; }
                  img.addEventListener('load', resolve, { once: true });
                  img.addEventListener('error', resolve, { once: true });
                });
              }
            } catch (e) {}
          }));
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      })()
    `);

    // printBackground: true is required for background colors/images to print
    const options = {
      silent: true,
      printBackground: true,
      deviceName: printerName || '',
    };

    await printWindow.webContents.print(options);
    printWindow.close();
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}

    return { success: true };
  } catch (error) {
    console.error('[Electron] Silent print error:', error);
    if (printWindow) printWindow.close();
    try { if (tempFile && fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (e) {}
    return { success: false, error: error.message };
  }
});

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
