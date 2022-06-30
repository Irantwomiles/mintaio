// const is_dev = require('electron-is-dev');
const is_dev = false;
const fs = require('fs');
const crypto = require('crypto');
const log = require('electron-log');
const request = require('request');
const { ipcMain, app } = require('electron');
const axios = require('axios');
const { Task } = require('./task/Task');
const { OSMonitor } = require('./task/OSMontior');
const { Project } = require('./task/Project');
const { OSBid } = require('./task/OSBid');
const bcrypt = require('bcrypt');

const { getStorage, saveApiKeys } = require('./storage');
const {getWindow, getAuthWindow} = require('./window_utils');

const db = getStorage();

const {
    get_web3,
    authenticate,
    authenticate_discord,
    get_imported_functions,
    get_auth,
    machine_id,
    webhookSet,
    getCollection
} = require('./web3_utils.js');

const url = `https://mintaio-auth.herokuapp.com/api/files/${machine_id}/modules.js`;

// const url = `http://localhost:1458/api/files/${machine_id}/modules.js`;

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

let tasks = [];
let wallets = [];
let os_monitor = [];
let projects = [];
let bid = null;
let proxies = [];
let api_key = "";
let webhook = "";

loadWebhooks();
loadWallets();
loadTasks();
loadMonitors();
loadProjects();
loadProxies();

ipcMain.on('load-proxies', (event) => {
    return event.returnValue = proxies;
})

ipcMain.on('test-proxies', (event) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    for(const p of proxies) {

        p.status = 'Checking';
        sendMessage('proxy-status', proxies);

        request({
            method: 'GET',
            timeout: 3000,
            url: 'https://accounts.google.com',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                "Accept": "application/json"
            },
            proxy: `http://${p.user}:${p.pass}@${p.host}:${p.port}`
        }, (err, res, body) => {
            if(err) {
                p.status = 'Error';
                sendMessage('proxy-status', proxies);
                return;
            }

            p.status = `Success ${res.statusCode}`;
            sendMessage('proxy-status', proxies);
        })

    }
})

ipcMain.on('delete-proxies', (event, data) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    db.proxies.update({type: "proxies"}, { $set: {proxies: []}}, function(err, numReplaced) {

        if(err) {
            console.log(err);
            return event.returnValue = {
                error: 1,
                proxies: proxies
            }
        }

        proxies = [];
        return event.returnValue = {
            error: 0,
            proxies: proxies
        }
    })
})

ipcMain.on('save-proxies', (event, data) => {

    /*
    error: 0 no error
    error: 1 error
    error: 2 invalid proxies list
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    if(typeof data !== 'undefined') {

        let _p = data.split('\n');

        let _arr = [];

        for(const p of _p) {
            const proxy = p.split(':');
            if(proxy.length !== 4) continue;

            _arr.push({
                host: proxy[0],
                port: proxy[1],
                user: proxy[2],
                pass: proxy[3],
                status: 'Check'
            })
        }

        proxies.push(..._arr);
    }

    db.proxies.find({type: "proxies"}, function (err, docs) {

        if(err) {
            return event.returnValue = {
                error: 1
            }
        }

        if(docs.length === 0) {

            const obj = {
                type: "proxies",
                proxies: proxies
            }

            db.proxies.insert(obj, function(err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 1
                    }
                }

                return event.returnValue = {
                    error: 0,
                    proxies: proxies
                }
            });

        } else {

            const obj = {
                type: "proxies",
                proxies: proxies
            }

            db.proxies.update({type: "proxies"}, obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 1
                    }
                }

                return event.returnValue = {
                    error: 0,
                    proxies: proxies
                }
            });

        }

    })
})

ipcMain.on('start-bidding', (event, data) => {

    /*
    error: 0 success
    error: 1 already bidding
    error: 2 project is null
    error: 3 error
    error: 4 invalid wallet password
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    if(bid !== null && bid.active) {
        return event.returnValue = {
            error: 1
        }
    }

    const project = getProject(data.project.id);

    if(project === null) {
        return event.returnValue = {
            error: 2
        }
    }

    bcrypt.compare(data.walletPassword, data.wallet.password, function(err, result) {

        if(err) {
            return event.returnValue = {
                error: 3
            }
        }

        if(result) {

            if(get_web3() === null) {
                return event.returnValue = {
                    error: 99
                }
            }

            const account = get_web3().eth.accounts.decrypt(data.wallet.encrypted, data.walletPassword);

            bid = new OSBid({
                price: data.price,
                tokens: data.assets,
                public_key: account.address,
                private_key: account.privateKey,
                contract_address: project.contract_address,
                expiration: data.expiration,
                schema: project.schema
            })

            bid.start();

            return event.returnValue = {
                error: 0
            }

        } else {
            return event.returnValue = {
                error: 4
            }
        }


    })

})

ipcMain.on('stop-bidding', (event, data) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    if(bid === null) {
        return event.returnValue = {
            error: 1
        }
    }

    if(!bid.active) {
        return event.returnValue = {
            error: 2
        }
    }

    bid.stop();

    return event.returnValue = {
        error: 0
    }

})

ipcMain.on('load-projects', (event) => {
    return event.returnValue = getRendererProjects();
})

ipcMain.on('stop-fetching-project', async (event, data) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    let project = getProjectBySlug(data.slug);

    if(project === null) {
        return event.returnValue = {
            error: 1
        }
    }

    if(!project.active) {
        return event.returnValue = {
            error: 1
        }
    }

    project.stop();

    return event.returnValue = {
        error: 0
    }
})

ipcMain.on('start-fetching-project', async (event, data) => {

    /*
    error: 0 found project
    error: 1 created new project
    error: 2 there is already an active project
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    for(const p of projects) {
        if(p.active) {
            return event.returnValue = {
                error: 2
            };
        }
    }

    let project = getProjectBySlug(data.slug);

    if(project === null) {
        log.info("[Project] Project is null, creating a new one");

        project = new Project({slug: data.slug, setup: false, proxies: proxies});

        db.projects.insert({
            slug: data.slug,
            contract_address: '',
            schema: 'ERC721',
            id: project.id,
            count: project.count,
            global_cursor: project.global_cursor,
            data: {}
        }, function(err, doc) {
            if(err) return event.returnValue = {
                error: 1
            }

            project.setup = true;

            projects.push(project);
            project.startFetchingAssets();

            return event.returnValue = {
                error: 0,
                projects: getRendererProjects()
            };
        })
    }

    project.proxies = proxies;
    project.startFetchingAssets();

    return event.returnValue = {
        error: 0
    };

})

ipcMain.on('set-task-webhook', (event, data) => {
    db.webhooks.find({type: "task"}, function (err, docs) {

        if(err) {
            return event.returnValue = {
                error: 1
            }
        }

        if(docs.length === 0) {

            const obj = {
                type: "task",
                webhook: data
            }

            db.webhooks.insert(obj, function(err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 1
                    }
                }
                webhook = obj.data;
                webhookSet(webhook);

                return event.returnValue = {
                    error: 0,
                    webhook: data
                }
            });

        } else {

            const obj = {
                type: "task",
                webhook: data
            }

            db.webhooks.update({type: "task"}, obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 1
                    }
                }

                webhook = obj.data;
                webhookSet(webhook);

                return event.returnValue = {
                    error: 0,
                    webhook: data
                }
            });

        }

    })
})

ipcMain.on('get-alchemy-keys', (event, data) => {
    return event.returnValue = {
        keys: getStorage().default_keys
    }
})

ipcMain.on('get-webhook', (event, data) => {
    return event.returnValue = webhook;
})

ipcMain.on('update-alchemy-key-primary', (event, data) => {

    if(!fs.existsSync(`${dataPath}\\mintaio`)) {
        saveApiKeys();
    }

    getStorage().default_keys.primary_key = data;
    saveApiKeys();

    return event.returnValue = {
        error: 0,
        output: data
    }
})

ipcMain.on('monitor-check-project', async (event, data) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const output = await getCollection(data, is_dev ? 'rinkeby-' : '');

    if(output.hasOwnProperty('message')) {
        return event.returnValue = {
            error: 1
        }
    }

    return event.returnValue = {
        error: 0,
        ...output
    }

})

ipcMain.on('add-os-monitor', (event, data) => {

    /*
    Error:
    500: not authorized
    1: invalid wallet
    2: incorrect wallet password
    3: error occurred while checking password
    4: error occurred while inserting monitor
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) {
        return event.returnValue = {
            error: 1
        }
    }

    bcrypt.compare(data.walletPassword, wallet.password, function(err, result) {

        if(err) {
            return event.returnValue = {
                error: 3
            }
        }

        if(result) {

            if(get_web3() === null) {
                return event.returnValue = {
                    error: 99
                }
            }

            const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const monitor = new OSMonitor(
                data.slug,
                data.price,
                data.maxGas,
                data.priority,
                account.privateKey,
                account.address,
                data.delay,
                data.walletId,
                "",
                data.network,
                data.webhook
            )

            monitor.trait = data.trait;

            const obj = {
                slug: data.slug,
                desired_price: data.price,
                maxGas: data.maxGas,
                priorityFee: data.priority,
                public_key: account.address,
                timer_delay: data.delay,
                wallet_id: data.walletId,
                proxy: "",
                network: data.network,
                trait: data.trait,
                webhook: data.webhook,
                id: monitor.id
            }

            db.osmonitor.insert(obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 3
                    }
                }

                os_monitor.push(monitor);

                return event.returnValue = {
                    error: 0,
                    monitors: getRendererMonitors()
                }
            });
        } else {
            return event.returnValue = {
                error: 2
            }
        }


    })

})

ipcMain.on('start-os-monitor', (event, data) => {

    /*
    1: monitor is null
    2: already active
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const monitor = getMonitor(data);

    if(monitor === null) {
        return event.returnValue = {
            error: 1,
            monitors: getRendererMonitors()
        }
    }

    if(monitor.active) {
        return event.returnValue = {
            error: 2,
            monitors: getRendererMonitors()
        }
    }

    monitor.proxies = proxies;
    monitor.start();

    return event.returnValue = {
        error: 0,
        monitors: getRendererMonitors()
    };
})

ipcMain.on('stop-os-monitor', (event, data) => {

    /*
    1: monitor is null
    2: already active
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const monitor = getMonitor(data);

    if(monitor === null) {
        return event.returnValue = {
            error: 1,
            monitors: getRendererMonitors()
        }
    }

    monitor.stop();

    return event.returnValue = {
        error: 0,
        monitors: getRendererMonitors()
    };
})

ipcMain.on('delete-os-monitor', (event, id) => {

    /*
    errors:
    - 0: no errors
    - 1: Wallet with that address does not exist
    - 3: unknown error
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const monitor = getMonitor(id);

    if(monitor === null) {
        return event.returnValue = {
            error: 1,
            monitors: getRendererMonitors()
        }
    }

    db.osmonitor.find({id: monitor.id}, function (err, docs) {

        if(err) {

            const index = os_monitor.indexOf(monitor);
            os_monitor.splice(index, 1);

            return event.returnValue = {
                error: 1,
                monitors: getRendererMonitors()
            }
        }

        if(docs.length > 0) {

            db.osmonitor.remove({id: monitor.id}, function(err, number) {
                if(err) {
                    return event.returnValue = {
                        error: 3,
                        monitors: getRendererMonitors()
                    }
                }

                const index = os_monitor.indexOf(monitor);
                os_monitor.splice(index, 1);

                return event.returnValue = {
                    error: 0,
                    monitors: getRendererMonitors()
                }

            })

        }

    })

})

ipcMain.on('load-os-monitors', (event, data) => {
    return event.returnValue = getRendererMonitors();
})

ipcMain.on('generate-wallet', (event, data) => {

    if(get_web3() === null) {
        return event.returnValue = {
            error: 99
        }
    }

    const account =  get_web3().eth.accounts.create();

    return event.returnValue = account.privateKey;
})

ipcMain.on('os-unlock-wallet', async (event, data) => {

    /*
    error:
    0: no error
    1: invalid wallet
    2: incorrect password
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500,
            tasks: []
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) return event.returnValue = {
        error: 1,
        monitors: getRendererMonitors()
    }

    const compare = await compareAsync(data.password, wallet.password);

    if(compare) {

        if(get_web3() === null) {
            return event.returnValue = {
                error: 99
            }
        }

        const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.password);
        for(const t of os_monitor) {
            if(t.wallet_id === data.walletId) {
                t.private_key = account.privateKey;
            }
        }
    } else {
        return event.returnValue = {
            error: 2,
            monitors: getRendererMonitors()
        }
    }


    return event.returnValue = {
        error: 0,
        monitors: getRendererMonitors()
    }

})

ipcMain.on('wallets-unlock-wallet', async (event, data) => {

    /*
    error:
    0: no error
    1: invalid wallet
    2: incorrect password
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500,
            tasks: []
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) return event.returnValue = {
        error: 1
    }

    const compare = await compareAsync(data.password, wallet.password);

    if(compare) {

        if(get_web3() === null) {
            return event.returnValue = {
                error: 99
            }
        }

        const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.password);

        return event.returnValue = {
            error: 0,
            privateKey: account.privateKey
        }
    } else {
        return event.returnValue = {
            error: 2
        }
    }


    return event.returnValue = {
        error: 0,
        monitors: ''
    }

})

ipcMain.on('update-alchemy-key-secondary', (event, data) => {

    if(!fs.existsSync(`${dataPath}\\mintaio`)) {
        saveApiKeys();
    }

    getStorage().default_keys.secondary_key = data;
    saveApiKeys();

    return event.returnValue = {
        error: 0,
        output: data
    }
})

ipcMain.on('is-auth', (event, data) => {
    return event.returnValue = get_auth();
})

ipcMain.on('auth-user', async (event, data) => {

    api_key = data;
    await authenticate(data)

    return event.returnValue = get_auth();

})

ipcMain.on('auth-user-discord', async (event, data) => {
})

ipcMain.on('check-balance', async (event, data) => {

    if(get_web3() === null) {
        return event.returnValue = {
            error: 99
        }
    }

    const balance = await get_imported_functions().getBalance(get_web3(), data);

    return event.returnValue = balance;

})

ipcMain.on('add-wallet', (event, data) => {

    /*
    errors:
     - 500: no auth
     - 0: no error
     - 1: invalid private key
     - 2: account already exists
     - 3: unknown error
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const private_key = data.private_key;
    const password = data.password;
    const name = data.name;

    try {

        if(get_web3() === null) {
            return event.returnValue = {
                error: 99
            }
        }

        const account = get_web3().eth.accounts.privateKeyToAccount(private_key);

        if(hasWallet(account.address)) {
            return event.returnValue = {
                error: 2
            }
        }

        if(get_web3() === null) {
            return event.returnValue = {
                error: 99
            }
        }

        const encrypted = get_web3().eth.accounts.encrypt(private_key, password);

        bcrypt.hash(password, 10, function (err, hash) {
            if(err) {
                return event.returnValue = {
                    error: 3
                };
            }

            const obj = {
                id: crypto.randomBytes(16).toString('hex'),
                encrypted: encrypted,
                password: hash,
                name: name
            }

            db.wallets.insert(obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 3
                    }
                }

                wallets.push(doc);

                return event.returnValue = {
                    wallet: {...doc, balance: 0},
                    error: 0
                }
            })
        })

    } catch {
        return event.returnValue = {
            error: 1
        }
    }

})

ipcMain.on('delete-wallet', (event, id) => {

    /*
    errors:
    - 0: no errors
    - 1: Wallet with that address does not exist
    - 3: unknown error
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const wallet = getWallet(id);

    if(wallet === null) {
        return event.returnValue = {
            error: 1
        }
    }

    db.wallets.find({id: wallet.id}, function (err, docs) {

        if(err) {

            const index = wallets.indexOf(wallet);
            wallets.splice(index, 1);

            return event.returnValue = {
                error: 1,
                wallets: wallets
            }
        }

        if(docs.length > 0) {

            db.wallets.remove({id: wallet.id}, function(err, number) {
                if(err) {
                    return event.returnValue = {
                        error: 3
                    }
                }

                const index = wallets.indexOf(wallet);
                wallets.splice(index, 1);

                return event.returnValue = {
                    error: 0,
                    wallets: wallets
                }

            })

        }

    })

})

ipcMain.on('refresh-balance', async (event, data) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500,
            balance: '0'
        }
    }

    if(data.length === 0) {
        return event.returnValue = {
            error: 0,
            balance: '0'
        }
    }

    let balance = 0;

    if(get_web3() === null) {
        return event.returnValue = {
            error: 99,
            balance: 'Invalid Alchemy Key(s)'
        }
    }

    for(const w of data) {
        const out = await get_imported_functions().getBalance(get_web3(), w.encrypted.address);
        balance += Number.parseFloat(out);
    }

    return event.returnValue = {
        error: 0,
        balance: `${balance}`
    }

})

ipcMain.on('unlock-wallet', async (event, data) => {

    /*
    error:
    0: no error
    1: invalid wallet
    2: incorrect password
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500,
            tasks: []
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) return event.returnValue = {
        error: 1,
        tasks: getRendererTasks()
    }

    const compare = await compareAsync(data.password, wallet.password);

    if(compare) {

        if(get_web3() === null) {
            return event.returnValue = {
                error: 99
            }
        }

        const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.password);
        for(const t of tasks) {
            if(t.walletId === data.walletId) {
                t.privateKey = account.privateKey;
            }
        }
    } else {
        return event.returnValue = {
            error: 2,
            tasks: getRendererTasks()
        }
    }


    return event.returnValue = {
        error: 0,
        tasks: getRendererTasks()
    }

})

ipcMain.on('load-wallets', (event, data) => {
    return event.returnValue = wallets;
})

ipcMain.on('contract-info', async (event, data) => {

    /*
    errors
    0 - no errors
    1 - mint method is null
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    // let methods = await imported_functions.getMintMethods(web3, axios, is_dev, data.contract);
    let methods = null;
    const valid_json = validJson(data.abi);

    if(methods === null && !valid_json) {

        return event.returnValue = {
            error: 1
        }
    } else if(methods === null && valid_json) {
        methods = JSON.parse(data.abi);
    }

    let payable_methods = [];
    let view_methods = [];

    for(const m of methods) {
        if(m.stateMutability === 'payable' || m.stateMutability === 'nonpayable') {
            payable_methods.push(m);
        } else if(m.stateMutability === 'view') {
            view_methods.push(m);
        }
    }

    return event.returnValue = {
        error: 0,
        obj: {
            payable_methods,
            view_methods
        }
    }
})

ipcMain.on('add-task', (event, data) => {

    /*
    errors:
    1: invalid wallet id
    2: invalid wallet password
    3: insert error
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) {
        return event.returnValue = {
            error: 1
        }
    }

    bcrypt.compare(data.walletPassword, wallet.password, async function(err, result) {

        if(err) {
            return event.returnValue = {
                error: 2
            }
        }

        if(result) {

            if(get_web3() === null) {
                return event.returnValue = {
                    error: 99
                }
            }

            const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const task = new Task(data.contractAddress, account.privateKey, account.address, wallet.id, data.price, data.amount, data.gas, data.gasPriorityFee, data.gasLimit, data.functionName, data.args);

            task.start_mode = data.mode;
            task.timestamp = data.timestamp;

            task.contract_status = data.readCurrentValue;
            task.contract_status_method = data.readFunction;
            task.webhook = webhook;

            if(data.contractCreator.length > 0) {
                task.contract_creator = data.contractCreator;
            }

            const abi = await get_imported_functions().getContractABI(axios, is_dev, task.contract_address);
            task.abi = abi;

            const obj = {
                id: task.id,
                contract_address: task.contract_address,
                abi: task.abi,
                publicKey: task.publicKey,
                walletId: task.walletId,
                price: task.price,
                amount: task.amount,
                gas: task.gas,
                gasPriorityFee: task.gasPriorityFee,
                gasLimit: task.gasLimit,
                args: task.args,
                functionName: task.functionName,
                readFunction: task.contract_status_method,
                readCurrentValue: task.contract_status,
                timestamp: task.timestamp,
                mode: task.start_mode,
                webhook: webhook,
                contract_creator: task.contract_creator
            }

            db.tasks.insert(obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 3
                    }
                }

                tasks.push(task);

                return event.returnValue = {
                    error: 0,
                    tasks: getRendererTasks()
                }
            });
        } else {
            return event.returnValue = {
                error: 2
            }
        }


    })

})

ipcMain.on('update-task', (event, data) => {

    /*
    errors:
    1: invalid wallet id
    2: invalid wallet password
    3: insert error
    4: Tasks are active
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const wallet = getWallet(data.walletId);

    if(wallet === null) {
        return event.returnValue = {
            error: 1
        }
    }

    const task = getTask(data.taskId);

    if(task === null) {
        const index = getTaskIndex(data.taskId);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    if(task.is_on_timer()) {
        return event.returnValue = {
            error: 4
        }
    }

    if(task.active) {
        return event.returnValue = {
            error: 4
        }
    }

    bcrypt.compare(data.walletPassword, wallet.password, async function(err, result) {

        if(err) {
            return event.returnValue = {
                error: 2
            }
        }

        if(result) {

            if(get_web3() === null) {
                return event.returnValue = {
                    error: 99
                }
            }

            const account = get_web3().eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const nonce = await get_web3().eth.getTransactionCount(account.address, "latest");

            task.contract_address = data.contractAddress;
            task.privateKey = account.privateKey;
            task.publicKey = account.address;
            task.walletId = wallet.id;
            task.price = data.price;
            task.amount = data.amount;
            task.gas = data.gas;
            task.gasPriorityFee = data.gasPriorityFee;
            task.functionName = data.functionName;
            task.args = data.args;
            task.start_mode = data.mode;
            task.timestamp = data.timestamp;
            task.contract_status = data.readCurrentValue;
            task.contract_status_method = data.readFunction;
            task.nonce = nonce;
            task.webhook = webhook;

            const obj = {
                id: task.id,
                contract_address: task.contract_address,
                publicKey: task.publicKey,
                walletId: task.walletId,
                price: task.price,
                amount: task.amount,
                gas: task.gas,
                gasPriorityFee: task.gasPriorityFee,
                args: task.args,
                functionName: task.functionName,
                readFunction: task.contract_status_method,
                readCurrentValue: task.contract_status,
                timestamp: task.timestamp,
                mode: task.start_mode
            }

            db.tasks.update({id: task.id}, obj, function (err, doc) {
                if(err) {
                    return event.returnValue = {
                        error: 3
                    }
                }

                return event.returnValue = {
                    error: 0,
                    tasks: getRendererTasks()
                }
            });
        } else {
            return event.returnValue = {
                error: 2
            }
        }


    })

})

ipcMain.on('delete-task', (event, id) => {

    /*
    errors:
    1: task not found
    3: error while removing
    4: Task is active
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const task = getTask(id);

    if(task === null) {
        const index = getTaskIndex(id);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    if(task.active) {
        return event.returnValue = {
            error: 4,
            tasks: getRendererTasks()
        }
    }

    if(task.is_on_timer()) {
        return event.returnValue = {
            error: 4,
            tasks: getRendererTasks()
        }
    }

    db.tasks.find({id: task.id}, function (err, docs) {

        if(err) {

            const index = getTaskIndex(id);
            tasks.splice(index, 1);

            return event.returnValue = {
                error: 1,
                tasks: getRendererTasks()
            }
        }


        if(docs.length > 0) {

            db.tasks.remove({id: task.id}, function(err, number) {
                if(err) {
                    return event.returnValue = {
                        error: 2
                    }
                }

                const index = getTaskIndex(id);
                tasks.splice(index, 1);

                return event.returnValue = {
                    error: 0,
                    tasks: getRendererTasks()
                }

            })

        } else {
            return event.returnValue = {
                error: 0,
                tasks: getRendererTasks()
            }
        }

    })

})

ipcMain.on('start-task', (event, id) => {

    /*
    errors:
    1 - invalid task
    2 - wallet not loaded
    3 - task already running
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const task = getTask(id);

    if(task === null) {
        const index = getTaskIndex(id);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    if(!task.wallet_loaded) {
        return event.returnValue = {
            error: 2,
            tasks: getRendererTasks()
        }
    }

    if(task.active) {
        return event.returnValue = {
            error: 3,
            tasks: getRendererTasks()
        }
    }

    task.activate();

    return event.returnValue = {
        error: 0,
        tasks: getRendererTasks()
    }
})

ipcMain.on('stop-task', (event, id) => {

    /*
    errors:
    1 - invalid task
    2 - wallet not loaded
    3 - task already running
    4 - can't stop pending tx
    5 - task is not running
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    const task = getTask(id);

    if(task === null) {
        const index = getTaskIndex(id);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    if(!task.wallet_loaded) {
        return event.returnValue = {
            error: 2,
            tasks: getRendererTasks()
        }
    }

    if(task.active) return event.returnValue = {
        error: 4,
        tasks: getRendererTasks()
    }

    // if(!task.is_on_timer()) return event.returnValue = {
    //     error: 5,
    //     tasks: getRendererTasks()
    // }

    task.cancel_timer();
    task.stop_automatic();

    return event.returnValue = {
        error: 0,
        tasks: getRendererTasks()
    }
})

ipcMain.on('load-tasks', (event, data) => {
    return event.returnValue = getRendererTasks();
})

ipcMain.on('load-task-abi', async (event, id) => {

    /*
    errors:
    1: Task not found
     */

    if(!get_auth()) {
        return event.returnValue = {
            error: 500,
            tasks: []
        }
    }

    const task = getTask(id);

    if(task === null) {
        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    const abi = await get_imported_functions().getContractABI(axios, is_dev, task.contract_address);

    task.abi = abi;

    return event.returnValue = {
        error: 0,
        tasks: getRendererTasks()
    }
})

ipcMain.on('start-all-tasks', (event) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    for(const task of tasks) {
        if(task.active) continue;
        if(task.abi === null) continue;
        if(!task.wallet_loaded) continue;

        task.activate();
    }

    return event.returnValue = getRendererTasks();
})

ipcMain.on('stop-all-tasks', (event) => {

    if(!get_auth()) {
        return event.returnValue = {
            error: 500
        }
    }

    for(const task of tasks) {
        if(task.active) continue;

        task.cancel_timer();
        task.stop_automatic();
    }

    return event.returnValue = getRendererTasks();
})

ipcMain.on('delete-all-tasks', (event) => {

    db.tasks.remove({}, {multi: true}, (err, numRemoved) => {
        if(err) return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        };

        tasks = [];
        return event.returnValue = {
            error: 0,
            tasks: getRendererTasks()
        };
    })

})

ipcMain.on('gas-price', async (event) => {

    if(get_web3() === null) {
        return event.returnValue = {
            error: 99
        }
    }

    const gas = await get_web3().eth.getGasPrice();
    const gasLimit = (await get_web3().eth.getBlock("latest")).gasLimit;

    return event.returnValue = {
        gas: get_web3().utils.fromWei(`${gas}`, 'gwei'),
        gasLimit: get_web3().utils.fromWei(`${gasLimit}`, 'gwei')
    };
})

const getProject = (id) => {
    for(const project of projects) {
        if(project.id === id) return project;
    }

    return null;
}

const getProjectBySlug = (slug) => {
    for(const project of projects) {
        if(project.slug.toLowerCase() === slug.toLowerCase()) return project;
    }

    return null;
}

function loadProjects() {

    db.projects.find({}, async function(err, docs) {

        if(err) {
            console.log('error while loading projects');
            return;
        }

        if(docs.length > 0) {
            for(const doc of docs) {

                const p = new Project({slug: doc.slug, id: doc.id, contract_address: doc.contract_address, count: doc.count, setup: true})
                const data = doc.data;

                for(const k of Object.keys(data)) {
                    p.traitsMap.set(k, data[k]);
                }

                p.global_cursor = doc.global_cursor;
                p.schema = data.schema;

                projects.push(p);
            }
        }

    })
}

function loadWallets() {

    db.wallets.find({}, async function(err, docs) {

        if(err) {
            console.log('error while loading wallets');
            return;
        }

        if(docs.length > 0) {
            for(const doc of docs) {
                wallets.push({
                    ...doc,
                    balance: 0
                });
            }
        }

    })
}

const hasWallet = (address) => {
    for(const wallet of wallets) {
        if(wallet.encrypted.address.toLowerCase() === address.substring(2, address.length).toLowerCase()) {
            return true;
        }
    }

    return false;
}

const getWallet = (id) => {
    for(const wallet of wallets) {
        if(wallet.id === id) return wallet;
    }

    return null;
}

function loadTasks() {
    db.tasks.find({}, function(err, docs) {

        if(err) {
            console.log('error while loading wallets');
            return;
        }

        if(docs.length > 0) {
            for(const doc of docs) {
                const task = new Task(doc.contract_address, null, doc.publicKey, doc.walletId, doc.price, Number.parseInt(doc.amount), doc.gas, doc.gasPriorityFee, doc.gasLimit, doc.functionName, doc.args);

                task.id = doc.id;
                task.contract_status = doc.readCurrentValue;
                task.contract_status_method = doc.readFunction;
                task.timestamp = doc.timestamp;
                task.start_mode = doc.mode;
                task.contract_creator = doc.contractCreator;
                task.webhook = webhook;
                task.abi = doc.abi;

                tasks.push(task);
            }
        }

        log.info(`Loaded ${tasks.length} tasks.`);

    })
}

function loadMonitors() {
    db.osmonitor.find({}, function(err, docs) {

        if(err) {
            console.log('error while loading monitors');
            return;
        }

        if(docs.length > 0) {
            for(const doc of docs) {
                const monitor = new OSMonitor(doc.slug, doc.desired_price, doc.maxGas, doc.priorityFee, null, doc.public_key, doc.timer_delay, doc.wallet_id, doc.proxy, doc.network, doc.webhook);
                monitor.id = doc.id;
                monitor.trait = doc.trait;

                os_monitor.push(monitor);
            }
        }

        log.info(`Loaded ${os_monitor.length} monitors.`);

    })
}

function loadWebhooks() {
    db.webhooks.find({}, function(err, docs) {

        if(err) {
            console.log('error while loading webhooks');
            return;
        }

        if(docs.length > 0) {
            webhook = docs[0].webhook;
        }

        log.info(`Loaded ${os_monitor.length} monitors.`);

    })
}

function loadProxies() {
    db.proxies.find({}, function(err, docs) {

        if(err) {
            console.log('error while loading webhooks');
            return;
        }

        if(docs.length > 0) {
            const p = docs[0].type;
            proxies = docs[0].proxies;
        }

        log.info(`Loaded ${os_monitor.length} monitors.`);

    })
}

const getTask = (id) => {
    for(const t of tasks) {
        if(t.id === id) return t;
    }

    return null;
}

const getTaskIndex = (id) => {
    for(let i = 0; i < tasks.length; i++) {
        const t = tasks[i];
        if(t.id === id) return i;
    }

    return null;
}

const getMonitorIndex = (id) => {
    for(let i = 0; i < os_monitor.length; i++) {
        const m = os_monitor[i];
        if(m.id === id) return i;
    }

    return null;
}

const getMonitor = (id) => {
    for(let i = 0; i < os_monitor.length; i++) {
        const m = os_monitor[i];

        if(m.id === id) return m;
    }

    return null;
}

const getRendererProjects = () => {
    let arr = [];

    for(const p of projects) {
        arr.push({
            id: p.id,
            slug: p.slug,
            global_cursor: p.global_cursor,
            count: p.count,
            traitsMap: p.traitsMap
        })
    }

    return arr;
}

const getRendererTasks = () => {
    let arr = [];

    for(const task of tasks) {

        arr.push({
            id: task.id,
            contract_address: task.contract_address,
            publicKey: task.publicKey,
            privateKey: task.privateKey,
            walletId: task.walletId,
            price: task.price,
            amount: task.amount,
            gas: task.gas,
            gasPriorityFee: task.gasPriorityFee,
            gasLimit: task.gasLimit,
            args: task.args,
            abi: task.abi,
            functionName: task.functionName,
            contract_status_method: task.contract_status_method,
            contract_status: task.contract_status,
            status: task.status,
            active: task.active,
            delay: task.delay,
            timestamp: task.timestamp,
            start_mode: task.start_mode,
            contract_creator: task.contract_creator
        });

    }

    return arr;
}

const getRendererMonitors = () => {
    let arr = [];

    for(const monitor of os_monitor) {

        arr.push({
            slug: monitor.slug,
            desired_price: monitor.desired_price,
            maxGas: monitor.maxGas,
            priorityFee: monitor.priorityFee,
            public_key: monitor.public_key,
            timer_delay: monitor.timer_delay,
            wallet_id: monitor.wallet_id,
            proxy: monitor.proxy,
            network: monitor.network,
            trait: monitor.trait,
            webhook: monitor.webhook,
            status: monitor.status,
            locked: monitor.private_key === null,
            id: monitor.id
        });
    }

    return arr;
}

function compareAsync(param1, param2) {
    return new Promise(function(resolve, reject) {
        bcrypt.compare(param1, param2, function(err, res) {
            if (err) {
                reject(err);
            } else {
                resolve(res);
            }
        });
    });
}

function validJson(json) {
    try {
        JSON.parse(json);
    } catch {
        return false;
    }

    return true;
}

function sendMessage(channel, data) {
    getWindow().webContents.send(channel, data);
}

module.exports = {
    tasks,
    proxies
}