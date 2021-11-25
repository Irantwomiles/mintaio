const Datastore = require('nedb')

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")

class Storage {
    constructor() {
        this.wallets = new Datastore({filename: `${dataPath}\\mintaio\\wallets.db`, autoload: true});
        this.tasks = new Datastore({filename: `${dataPath}\\mintaio\\tasks.db`, autoload: true});
    }
}

const storage = new Storage()

function getStorage() {
    return storage
}

module.exports = {
    getStorage
}