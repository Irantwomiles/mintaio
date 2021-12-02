let window_utils = null;

function getWindow() {
    return window_utils
}

function setWindow(w){
    window_utils = w
}

module.exports = {
    getWindow, setWindow
}