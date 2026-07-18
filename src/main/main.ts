import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  screen,
  Tray,
} from 'electron';
import path from 'node:path';

import type { AppData } from '../shared/api';
import {
  DEFAULT_SETTINGS,
  getPhaseName,
  TimerPhase,
  type TimerSettings,
  type TimerState,
} from '../shared/timer';
import { readData, writeData } from './data';
import { Timer } from './timer';

const popoverBackground = '#016551';
let menuBar: Tray;
let popover: BrowserWindow;
let quitting = false;

if (process.platform === 'darwin') {
  app.setActivationPolicy('accessory');
}

function createPopover(): void {
  popover = new BrowserWindow({
    alwaysOnTop: true,
    backgroundColor: popoverBackground,
    frame: false,
    fullscreenable: false,
    height: 432,
    resizable: false,
    show: false,
    skipTaskbar: true,
    type: 'panel',
    width: 360,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });

  popover.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void popover.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void popover.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  popover.on('blur', () => popover.hide());
  popover.on('close', (event) => {
    if (!quitting) {
      event.preventDefault();
      popover.hide();
    }
  });
}

function showPopover(): void {
  const trayBounds = menuBar.getBounds();
  const windowBounds = popover.getBounds();
  const workArea = screen.getDisplayNearestPoint({
    x: trayBounds.x,
    y: trayBounds.y,
  }).workArea;
  const centeredX = trayBounds.x + (trayBounds.width - windowBounds.width) / 2;
  const x = Math.round(
    Math.min(
      Math.max(centeredX, workArea.x),
      workArea.x + workArea.width - windowBounds.width,
    ),
  );

  popover.setPosition(x, workArea.y);
  popover.show();
  popover.focus();
}

function togglePopover(): void {
  if (popover.isVisible()) {
    popover.hide();
    return;
  }

  showPopover();
}

function updateMenuBar(state: TimerState): void {
  const seconds = Math.ceil(state.remainingMilliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const title = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;

  menuBar.setTitle(title, { fontType: 'monospacedDigit' });
}

function showCompletion(
  completedPhase: TimerPhase,
  nextPhase: TimerPhase,
): void {
  new Notification({
    body: `Next: ${getPhaseName(nextPhase)}`,
    sound: 'Blow',
    title: `${getPhaseName(completedPhase)} complete`,
  }).show();
}

app.whenReady().then(() => {
  const filePath = path.join(app.getPath('userData'), 'data.json');
  const data = readData(filePath);
  let settings = data?.settings ?? DEFAULT_SETTINGS;
  const timer = new Timer(settings, data?.timer ?? null);

  const save = (now: number): TimerState => {
    const state = timer.getState(now);
    writeData(filePath, { settings, timer: state });
    return state;
  };

  const now = Date.now();
  timer.tick(now);
  const initialState = save(now);

  ipcMain.handle('timer:getData', (): AppData => ({
    settings,
    timer: timer.getState(Date.now()),
  }));
  ipcMain.handle('timer:start', (): TimerState => {
    const currentTime = Date.now();
    timer.start(currentTime);
    const state = save(currentTime);
    updateMenuBar(state);
    return state;
  });
  ipcMain.handle('timer:pause', (): TimerState => {
    const currentTime = Date.now();
    const completedPhase = timer.pause(currentTime);
    const state = save(currentTime);
    updateMenuBar(state);
    if (completedPhase !== null) {
      showCompletion(completedPhase, state.phase);
    }
    return state;
  });
  ipcMain.handle('timer:reset', (): TimerState => {
    timer.reset();
    const state = save(Date.now());
    updateMenuBar(state);
    return state;
  });
  ipcMain.handle(
    'timer:setProgress',
    (_event, progress: number): TimerState => {
      const currentTime = Date.now();
      timer.setProgress(progress, currentTime);
      const state = save(currentTime);
      updateMenuBar(state);
      return state;
    },
  );
  ipcMain.handle('timer:skip', (): TimerState => {
    timer.skip();
    const state = save(Date.now());
    updateMenuBar(state);
    return state;
  });
  ipcMain.handle(
    'timer:updateSettings',
    (_event, nextSettings: TimerSettings): AppData => {
      settings = { ...nextSettings };
      timer.updateSettings(settings);
      const state = save(Date.now());
      updateMenuBar(state);
      return { settings, timer: state };
    },
  );

  menuBar = new Tray(nativeImage.createEmpty());
  menuBar.setToolTip('Pomodoro');
  updateMenuBar(initialState);
  menuBar.on('click', togglePopover);
  menuBar.on('right-click', () => {
    menuBar.popUpContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Settings',
          click: () => {
            showPopover();
            popover.webContents.send('app:showSettings');
          },
        },
        {
          label: 'Quit Pomodoro',
          click: () => app.quit(),
        },
      ]),
    );
  });

  createPopover();

  setInterval(() => {
    const currentTime = Date.now();
    const completedPhase = timer.tick(currentTime);
    if (completedPhase !== null) {
      const state = save(currentTime);
      showCompletion(completedPhase, state.phase);
      updateMenuBar(state);
      popover.webContents.send('timer:stateChanged', state);
      return;
    }
    updateMenuBar(timer.getState(currentTime));
  }, 1000);
});

app.on('before-quit', () => {
  quitting = true;
});
