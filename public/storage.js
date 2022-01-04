const Datastore = require('nedb');
const fs = require('fs');

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

class Storage {
    constructor() {
        this.wallets = new Datastore({filename: `${dataPath}\\mintaio\\wallets.db`, autoload: true});
        this.tasks = new Datastore({filename: `${dataPath}\\mintaio\\tasks.db`, autoload: true});

        this.default_keys = {
            primary_key: "dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4",
            secondary_key: "22SFODSbXp_n6Zedhj_4w1o5M4FmS-C_"
        }

        if(!fs.existsSync(`${dataPath}\\mintaio\\api_keys.json`)) {
            fs.writeFileSync(`${dataPath}\\mintaio\\api_keys.json`, JSON.stringify(this.default_keys));
        } else {

            const output = fs.readFileSync(`${dataPath}\\mintaio\\api_keys.json`);
            const json_value = JSON.parse(output);

            this.default_keys = json_value;
        }

    }
}

const storage = new Storage();

function getStorage() {
    return storage;
}

function saveApiKeys() {
    fs.writeFileSync(`${dataPath}\\mintaio\\api_keys.json`, JSON.stringify(getStorage().default_keys));
}

module.exports = {
    getStorage, saveApiKeys
}