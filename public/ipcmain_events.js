const { ipcMain, app } = require('electron');
const axios = require('axios');

const bcrypt = require('bcrypt');
const { getStorage, saveApiKeys } = require('./storage');
const fs = require('fs');
const requireFromWeb = require('require-from-web');

const db = getStorage();

const { web3,
    web3_logger,
    machine_id
} = require('./web3_utils.js');

const url = `https://mintaio-auth.herokuapp.com/api/files/${machine_id}/modules.js`;

const crypto = require('crypto');
const { Task } = require('./task/Task');
const { OSMonitor } = require('./task/OSMontior');
const is_dev = require('electron-is-dev');

const erc721_abi = require("./ERC721-ABI.json");
const {getWindow} = require("./window_utils");

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

let tasks = [];
let wallets = [];
let os_monitor = [];
let mint_logs = [];

let isAuth = false;
let imported_functions = null;

loadWallets();
loadTasks();
loadMonitors();

ipcMain.on('get-alchemy-keys', (event, data) => {
    return event.returnValue = {
        keys: getStorage().default_keys
    }
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

ipcMain.on('add-os-monitor', (event, data) => {

    /*
    Error:
    500: not authorized
    1: invalid wallet
    2: incorrect wallet password
    3: error occurred while checking password
    4: error occurred while inserting monitor
     */

    if(!isAuth) {
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

            const account = web3.eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const monitor = new OSMonitor(
                data.contract,
                data.price,
                data.maxGas,
                data.priority,
                account.privateKey,
                account.address,
                data.delay,
                data.walletId,
                "",
                data.webhook
            )

            const obj = {
                contract_address: data.contract,
                desired_price: data.price,
                maxGas: data.maxGas,
                priorityFee: data.priority,
                public_key: account.address,
                timer_delay: data.delay,
                wallet_id: data.walletId,
                proxy: "",
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

    const monitor = getMonitor(data);

    if(monitor === null) {
        return event.returnValue = {
            error: 1,
            monitors: getRendererMonitors()
        }
    }

    console.log("Here 1");

    if(monitor.active) {
        return event.returnValue = {
            error: 2,
            monitors: getRendererMonitors()
        }
    }

    console.log("Here 2");

    monitor.start();

    return event.returnValue = {
        error: 0,
        monitors: getRendererMonitors()
    };
})

ipcMain.on('load-os-monitors', (event, data) => {
    return event.returnValue = getRendererMonitors();
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
    return event.returnValue = isAuth;
})

ipcMain.on('auth-user', async (event, data) => {
    const output = await axios.get(`https://mintaio-auth.herokuapp.com/api/${data}/${machine_id}`);

    if(output.data === "redeemed") {
        app.relaunch();
        app.exit();
        return;
    }

    const modules = requireFromWeb(url);

    if(imported_functions === null) {
        imported_functions = await modules;
    }

    if(output.data.length > 0) isAuth = true;

    return event.returnValue = isAuth;
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

    if(!isAuth) {
        return event.returnValue = {
            error: 500
        }
    }

    const private_key = data.private_key;
    const password = data.password;
    const name = data.name;

    try {
        const account = web3.eth.accounts.privateKeyToAccount(private_key);

        if(hasWallet(account.address)) {
            return event.returnValue = {
                error: 2
            }
        }

        const encrypted = web3.eth.accounts.encrypt(private_key, password);

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
                    wallet: doc,
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

    if(!isAuth) {
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

    if(!isAuth) {
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

    for(const w of data) {
        const out = await imported_functions.getBalance(web3, w.encrypted.address);
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

    if(!isAuth) {
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
        const account = web3.eth.accounts.decrypt(wallet.encrypted, data.password);
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

    if(!isAuth) {
        return event.returnValue = {
            error: 500
        }
    }

    const methods = await imported_functions.getMintMethods(web3, axios, is_dev, data);

    if(methods === null) {
        return event.returnValue = {
            error: 1
        }
    }

    let payable_methods = [];
    let view_methods = [];

    for(const m of methods) {
        if(m.stateMutability === 'payable') {
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

    if(!isAuth) {
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
                error: 2
            }
        }

        if(result) {

            const account = web3.eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const task = new Task(data.contractAddress, account.privateKey, account.address, wallet.id, data.price, data.amount, data.gas, data.gasPriorityFee, data.functionName, data.args);

            task.start_mode = data.mode;
            task.timer = data.timer;

            task.contract_status = data.readCurrentValue;
            task.contract_status_method = data.readFunction;

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
                timer: task.timer,
                mode: task.start_mode
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

    if(!isAuth) {
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

            const account = web3.eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

            const nonce = await web3.eth.getTransactionCount(account.address, "latest");

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
            task.timer = data.timer;
            task.contract_status = data.readCurrentValue;
            task.contract_status_method = data.readFunction;
            task.nonce = nonce;

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
                timer: task.timer,
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

    if(!isAuth) {
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

    if(!isAuth) {
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

    if(!isAuth) {
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

    const task = getTask(id);

    if(task === null) {
        return event.returnValue = {
            error: 1,
            tasks: getRendererTasks()
        }
    }

    const abi = await imported_functions.getContractABI(axios, is_dev, task.contract_address);

    task.abi = abi;

    return event.returnValue = {
        error: 0,
        tasks: getRendererTasks()
    }
})

ipcMain.on('start-all-tasks', (event) => {

    for(const task of tasks) {
        if(task.active) continue;
        if(task.abi === null) continue;
        if(!task.wallet_loaded) continue;

        task.activate();
    }

    return event.returnValue = getRendererTasks();
})

ipcMain.on('stop-all-tasks', (event) => {

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

    const gas = await web3.eth.getGasPrice();
    const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

    return event.returnValue = {
        gas: web3.utils.fromWei(`${gas}`, 'gwei'),
        gasLimit: web3.utils.fromWei(`${gasLimit}`, 'gwei')
    };
})

ipcMain.on('mint-logs', async (event) => {

    return event.returnValue = mint_logs;
})

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
                const task = new Task(doc.contract_address, null, doc.publicKey, doc.walletId, doc.price, Number.parseInt(doc.amount), doc.gas, doc.gasPriorityFee, doc.functionName, doc.args);
                task.id = doc.id;
                task.contract_status = doc.readCurrentValue;
                task.contract_status_method = doc.readFunction;
                task.timer = doc.timer;
                task.start_mode = doc.mode;

                tasks.push(task);
            }
        }

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
                const monitor = new OSMonitor(doc.contract_address, doc.desired_price, doc.maxGas, doc.priorityFee, null, doc.public_key, doc.wallet_id, doc.proxy, doc.webhook);
                monitor.id = doc.id;

                os_monitor.push(monitor);
            }
        }

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
            args: task.args,
            abi: task.abi,
            functionName: task.functionName,
            contract_status_method: task.contract_status_method,
            contract_status: task.contract_status,
            status: task.status,
            active: task.active,
            delay: task.delay,
            timer: task.timer,
            start_mode: task.start_mode
        });

    }

    return arr;
}

const getRendererMonitors = () => {
    let arr = [];

    for(const monitor of os_monitor) {

        arr.push({
            contract_address: monitor.contract_address,
            desired_price: monitor.desired_price,
            maxGas: monitor.maxGas,
            priorityFee: monitor.priorityFee,
            public_key: monitor.public_key,
            timer_delay: monitor.timer_delay,
            walletId: monitor.wallet_id,
            proxy: monitor.proxy,
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

// let log = web3_logger.eth.subscribe('logs', async function(err, result) {
//     if(!err) {
//
//         const transaction_receipt = await web3_logger.eth.getTransactionReceipt(result.transactionHash);
//
//         if(transaction_receipt === null) return;
//
//         if(!transaction_receipt.hasOwnProperty('logs')) return;
//
//         if(transaction_receipt.logs && transaction_receipt.logs.length >= 1) {
//             const logs = transaction_receipt.logs[0];
//
//             if(!validToken(transaction_receipt.logs)) return;
//
//             if(logs.topics.length === 4) {
//                 const topic1 = logs.topics[0]; // event
//                 const topic2 = logs.topics[1]; // from address (0x00..000)
//                 const topic3 = logs.topics[2]; // to address
//                 const topic4 = logs.topics[3]; // amount
//
//                 if(topic1.toLowerCase() !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'.toLowerCase() || topic2.toLowerCase() !== '0x0000000000000000000000000000000000000000000000000000000000000000') return;
//
//                 // if the value is undefined or the tokenId > 12000 skip
//                 if(typeof topic4 === 'undefined' || topic4 > 12000) return;
//
//                 const transaction = await web3.eth.getTransaction(result.transactionHash);
//                 // console.log(result.transactionHash, transaction.to);
//
//                 const contract_address = transaction.to;
//
//                 const contract = new web3_logger.eth.Contract(erc721_abi, contract_address);
//
//                 let obj = {
//                     contract_address: contract_address,
//                     name: 'N/A',
//                     value: transaction_receipt.logs.length > 0 ? Number.parseFloat(web3_logger.utils.fromWei(transaction.value, 'ether')) / transaction_receipt.logs.length : web3_logger.utils.fromWei(transaction.value, 'ether')
//                 }
//
//                 if(contract !== null) {
//                     try{
//                         const name = await contract.methods.name().call();
//                         obj.name = name;
//                     } catch(e) {
//                     }
//                 }
//
//                 if(mint_logs.length >= 1000) {
//                     mint_logs = [];
//                 }
//
//                 mint_logs.unshift(obj);
//
//                 getWindow().webContents.send('mint-watch', mint_logs);
//
//             }
//
//         }
//
//     }
// })