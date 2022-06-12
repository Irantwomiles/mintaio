const Datastore = require('nedb');
const fs = require('fs');
const path = require('path');

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

class Storage {
    constructor() {
        this.wallets = new Datastore({filename: `${dataPath}\\mintaio\\wallets.db`, autoload: true});
        this.tasks = new Datastore({filename: `${dataPath}\\mintaio\\tasks.db`, autoload: true});
        this.osmonitor = new Datastore({filename: `${dataPath}\\mintaio\\osmonitor.db`, autoload: true});
        this.proxies = new Datastore({filename: `${dataPath}\\mintaio\\proxies.db`, autoload: true});
        this.projects = new Datastore({filename: `${dataPath}\\mintaio\\projects.db`, autoload: true});
        this.webhooks = new Datastore({filename: `${dataPath}\\mintaio\\webhooks.db`, autoload: true});

        this.default_keys = {
            primary_key: "Xl9CjNo9SjtCLYcYH-X9cdQWqi4c5l39",
            secondary_key: "Vtc8QvrFfVlcUch4cTUuxqpJ9SR4HCpL"
        }

        if(process.platform === 'darwin') {
            if(fs.existsSync(path.join(dataPath, 'mintaio'))) {
                console.log("file path exists");

                createMacFiles(this.default_keys);

            } else {
                console.log("file path does not exist");
                fs.mkdirSync(path.join(dataPath, 'mintaio'));
                console.log("creating mintaio directory");
                createMacFiles(this.default_keys);
            }
        } else {
            if(fs.existsSync(`${dataPath}\\mintaio`)) {

                console.log("mintaio path exists");

                if(!fs.existsSync(`${dataPath}\\mintaio\\api_keys.json`)) {
                    console.log("api_keys.json doesn't exist", dataPath);
                    fs.writeFileSync(`${dataPath}\\mintaio\\api_keys.json`, JSON.stringify(this.default_keys));
                } else {

                    console.log("api_keys.json exists", dataPath);

                    const output = fs.readFileSync(`${dataPath}\\mintaio\\api_keys.json`);
                    const json_value = JSON.parse(output);

                    this.default_keys = json_value;
                }
            } else {
                console.log("mintaio path does not exist", `${dataPath}\\mintaio`);
            }
        }

    }
}

const storage = new Storage();

function getStorage() {
    return storage;
}

function createMacFiles(data) {
    fs.writeFileSync(path.join(dataPath, 'mintaio', 'api_keys.json'), JSON.stringify(data));
    if(!fs.existsSync(path.join(dataPath, 'mintaio', 'api_keys.json'))) {
        console.log("api_keys.json doesn't exist", dataPath);
        fs.writeFileSync(path.join(dataPath, 'mintaio', 'api_keys.json'), JSON.stringify(data));
    } else {

        console.log("api_keys.json exists", dataPath);

        const output = fs.readFileSync(path.join(dataPath, 'mintaio', 'api_keys.json'));
        const json_value = JSON.parse(output);

        this.default_keys = json_value;
    }
}

function saveApiKeys() {
    if(process.platform === 'darwin') {
        fs.writeFileSync(path.join(dataPath, 'mintaio', 'api_keys.json'), JSON.stringify(getStorage().default_keys));
    } else {
        fs.writeFileSync(`${dataPath}\\mintaio\\api_keys.json`, JSON.stringify(getStorage().default_keys));
    }
}

module.exports = {
    getStorage, saveApiKeys
}