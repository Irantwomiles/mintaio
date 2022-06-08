let window_utils = null;
let auth_utils = null;

function getWindow() {
    return window_utils
}

function setWindow(w){
    window_utils = w
}

function getAuthWindow() {
    return auth_utils
}

function setAuthWindow(w){
    auth_utils = w
}

module.exports = {
    getWindow, setWindow, getAuthWindow, setAuthWindow
}