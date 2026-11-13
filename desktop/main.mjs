import {app, BrowserWindow, dialog, session, shell} from 'electron';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {createPlatformServer} from './server/app.mjs';
import {createOscReceiver} from './dist/examples/platform_osc_bridge.mjs';

// IndexedDB and localStorage are tied to this origin across upgrades and restarts.
const host = '127.0.0.1';
const port = 43879;
const origin = 'http://' + host + ':' + port;
const secret = randomBytes(32).toString('hex');
let mainWindow;
let localServer;

function fromApp(url) {
  return typeof url === 'string' && (url === origin || url.startsWith(origin + '/'));
}

async function startServer() {
  const osc = createOscReceiver();
  localServer = createPlatformServer((req, res, next) => {
    if (req.headers.host !== host + ':' + port || req.headers['x-platform-session'] !== secret) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'");
    return next();
  }, async (req, res) => {
    if (!['/api/desktop/osc', '/api/desktop/osc/int32', '/api/desktop/osc/coordinates'].includes(req.url)) return false;
    if (req.headers.origin !== origin) res.writeHead(403).end();
    else await osc.handle(req, res, req.url.endsWith('/int32'),req.url.endsWith('/coordinates'));
    return true;
  });
  const listening = once(localServer, 'listening');
  localServer.listen(port, host);
  await listening;
}

function configureSession(ses) {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = details.requestHeaders;
    if (fromApp(details.url)) headers['X-Platform-Session'] = secret;
    callback({requestHeaders: headers});
  });
  const allowed = new Set(['media', 'serial', 'fullscreen', 'local-network-access', 'loopback-network', 'local-network']);
  ses.setPermissionCheckHandler((_contents, permission, requestingOrigin) => fromApp(requestingOrigin) && allowed.has(permission));
  ses.setPermissionRequestHandler((contents, permission, respond, details) => {
    respond(contents === mainWindow?.webContents && fromApp(details.requestingUrl) && allowed.has(permission));
  });
  ses.on('select-serial-port', async (event, ports, contents, select) => {
    event.preventDefault();
    if (contents !== mainWindow?.webContents || !ports.length) return select('');
    const buttons = ports.map(device => device.displayName || device.portName || device.portId);
    buttons.push(app.getLocale().startsWith('zh') ? '取消' : 'Cancel');
    try {
      const {response} = await dialog.showMessageBox(mainWindow, {
        message: app.getLocale().startsWith('zh') ? '选择串口设备' : 'Choose a serial device',
        buttons, cancelId: ports.length, defaultId: ports.length
      });
      select(ports[response]?.portId || '');
    } catch {
      select('');
    }
  });
}

async function openWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 840, minWidth: 600, minHeight: 420,
    title: 'Platform', backgroundColor: '#f5f7fa', autoHideMenuBar: true,
    webPreferences: {sandbox: true, contextIsolation: true, nodeIntegration: false}
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!fromApp(url)) event.preventDefault();
  });
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    if (new URL(url).protocol === 'https:') void shell.openExternal(url).catch(() => {});
    return {action: 'deny'};
  });
  await mainWindow.loadURL(origin);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => localServer?.close());
  app.whenReady().then(async () => {
    await startServer();
    configureSession(session.defaultSession);
    await openWindow();
  }).catch(error => {
    const busy = error.code === 'EADDRINUSE';
    dialog.showErrorBox('Platform', busy ? '本机端口 43879 已被占用。\nLocal port 43879 is in use. Close the other service and reopen Platform.' : error.message);
    app.quit();
  });
}
