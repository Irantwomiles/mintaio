// process.env.UV_THREADPOOL_SIZE = 128;

// console.log(process.env.UV_THREADPOOL_SIZE);

const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')
const is_dev = require('electron-is-dev');

const { setWindow, setAuthWindow } = require('./window_utils');
require('./ipcmain_events.js');
require('./subscriptions.js');

let mainWindow = null;
let authWindow = null;

const createWindow = () => {
    // Create the browser window.

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        resizable: false,
        show: false
    })


    Menu.setApplicationMenu(null);

    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    })

    // and load the index.html of the app.
    mainWindow.loadURL(is_dev ? 'http://localhost:3000/' : `file://${path.join(__dirname, "../build/index.html")}`);

    // Open the DevTools.
    if(is_dev) {
        mainWindow.webContents.openDevTools();
    }

    require('./server.js');

    setWindow(mainWindow);
}

const createAuthWindow = () => {
    // Create the browser window.

    if(authWindow !== null) {
        authWindow.close();
    }

    authWindow = null;

    authWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: false
        },
        resizable: false,
        show: false
    })

    Menu.setApplicationMenu(null);

    // and load the index.html of the app.

    authWindow.on('ready-to-show', () => {
        authWindow.show();
    })

    authWindow.on('close', () => {
        authWindow = null;
    })

    const DISCORD_CLIENT_ID = '983082460139122728';

    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=http%3A%2F%2Flocalhost%3A1948%2Fauth%2Fcallback&response_type=code&scope=identify%20guilds%20guilds.members.read`;

    authWindow.loadURL(url);

    if(is_dev) {
        authWindow.webContents.openDevTools();
    }

    setAuthWindow(authWindow);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('auth-user-discord', async (event, data) => {
    createAuthWindow();
})

module.exports = {
    createAuthWindow
}