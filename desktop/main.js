// TV Libre — version bureau (Electron). Réutilise l'interface de l'appli Android.
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Certains flux refusent l'user-agent "Electron" : on présente un Chrome classique.
app.userAgentFallback = app.userAgentFallback.replace(/\s?(Electron|tvlibre|TV Libre)\/\S+/gi, '');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 420,
    minHeight: 600,
    backgroundColor: '#0b0d12',
    title: 'TV Libre',
    autoHideMenuBar: true,
    webPreferences: {
      // Lecteur local : on autorise les flux d'autres domaines (pas de blocage CORS).
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: true,
      sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'web', 'index.html'));

  // Les liens externes s'ouvrent dans le navigateur, jamais dans l'appli.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) e.preventDefault();
  });
  // F11 = plein écran de la fenêtre
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
