/**
 * Vexora Stream - Desktop Application (Electron Main Process)
 * Membuka Vexora Studio dalam bentuk aplikasi desktop mandiri (.exe)
 * dengan background server terintegrasi untuk OBS Browser Source & Custom Dock.
 */

const { app, BrowserWindow, Menu, Tray, shell, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');

// Cegah multi-instance (hanya 1 instance Vexora Stream yang berjalan)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow = null;
  let tray = null;
  let isQuitting = false;

  // Pastikan folder data user writable di AppData
  try {
    const userDataPath = path.join(app.getPath('userData'), 'data');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    process.env.VEXORA_DATA_DIR = userDataPath;
  } catch (err) {
    console.warn('[Main] Gagal inisialisasi userDataPath:', err.message);
  }

  // Jalankan server backend Vexora Stream
  const { PORT } = require('./server/index.js');
  const serverUrl = `http://localhost:${PORT || 3333}`;
  const dockUrl = `${serverUrl}/dock.html`;
  const overlayUrl = `${serverUrl}/overlay.html`;

  function createMainWindow() {
    mainWindow = new BrowserWindow({
      width: 1320,
      height: 860,
      minWidth: 960,
      minHeight: 650,
      title: 'Vexora Stream — Unified Live Suite (TikTok + YouTube)',
      backgroundColor: '#0a0d14',
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Muat Studio Dashboard
    mainWindow.loadURL(serverUrl);

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
    });

    // Tangani link eksternal agar terbuka di browser default
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http:') || url.startsWith('https:')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        // Biarkan pengguna tetap bisa minimize atau menutup aplikasi
        // Jika ingin langsung quit, biarkan quit normal
      }
    });

    createAppMenu();
  }

  function createAppMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Buka OBS Multi-Chat Dock di Browser',
            click: () => shell.openExternal(dockUrl)
          },
          {
            label: 'Buka OBS Overlay di Browser',
            click: () => shell.openExternal(overlayUrl)
          },
          { type: 'separator' },
          {
            label: 'Salin Link OBS Overlay',
            click: () => {
              clipboard.writeText(overlayUrl);
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Link Disalin',
                message: 'Link OBS Overlay berhasil disalin ke clipboard:\n' + overlayUrl
              });
            }
          },
          {
            label: 'Salin Link OBS Dock',
            click: () => {
              clipboard.writeText(dockUrl);
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Link Disalin',
                message: 'Link OBS Custom Dock berhasil disalin ke clipboard:\n' + dockUrl
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Keluar',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              isQuitting = true;
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Tampilan',
        submenu: [
          { role: 'reload', label: 'Muat Ulang (Reload)' },
          { role: 'forceReload', label: 'Paksa Muat Ulang' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Ukuran Normal' },
          { role: 'zoomIn', label: 'Perbesar' },
          { role: 'zoomOut', label: 'Perkecil' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Layar Penuh (Fullscreen)' },
          { role: 'toggleDevTools', label: 'Developer Tools' }
        ]
      },
      {
        label: 'Bantuan',
        submenu: [
          {
            label: 'Panduan Pasang di OBS Studio',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Panduan OBS Studio',
                message: 'Cara Menggunakan di OBS Studio:\n\n' +
                  '1. OBS Live Chat Dock:\n' +
                  '   Buka OBS -> Menu Docks -> Custom Browser Docks...\n' +
                  '   Beri nama: "Vexora Chat"\n' +
                  `   Masukkan URL: ${dockUrl}\n\n` +
                  '2. OBS Overlay (Chat / Gift Alerts / Goals):\n' +
                  '   Di OBS Sources -> Klik (+) -> Browser\n' +
                  `   Masukkan URL: ${overlayUrl}\n` +
                  '   Width: 1920, Height: 1080, centang "Shutdown source when not visible"'
              });
            }
          },
          {
            label: 'Tentang Vexora Stream',
            click: () => {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Tentang Vexora Stream',
                message: 'Vexora Stream v1.0.0\nUnified Streaming Suite untuk TikTok LIVE + YouTube Live simultan.\n\n© 2026 Vexora Studios.'
              });
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  app.on('window-all-closed', () => {
    isQuitting = true;
    app.quit();
  });
}
