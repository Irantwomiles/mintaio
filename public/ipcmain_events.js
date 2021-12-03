const { ipcMain } = require('electron');
const bcrypt = require('bcrypt');
const { web3, getMintMethod, getBalance } = require('./web3_utils.js');
const crypto = require('crypto');
const { getStorage } = require('./storage');
const { Task } = require('./task/Task');

const db = getStorage();

let tasks = [];
let wallets = [];

loadWallets();
loadTasks();

ipcMain.on('add-wallet', (event, data) => {

    /*
    errors:
     - 0: no error
     - 1: invalid private key
     - 2: account already exists
     - 3: unknown error
     */

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

    if(data.length === 0) {
        return event.returnValue = {
            error: 0,
            balance: '0'
        }
    }

    let balance = 0;

    for(const w of data) {
        balance += await getBalance(w.encrypted.address);
    }

    return event.returnValue = {
        error: 0,
        balance: `${balance}`
    }

})

ipcMain.on('unlock-wallet', async (event, data) => {

    const wallet = getWallet(data.walletId);

    if(wallet === null) return event.returnValue = {
        error: 1
    }

    const compare = await compareAsync(data.password, wallet.password);

    if(compare) {
        const account = web3.eth.accounts.decrypt(wallet.encrypted, data.password);
        for(const t of tasks) {
            if(t.walletId === data.walletId) {
                t.privateKey = account.privateKey;
            }
        }
    }

    return event.returnValue = {
        error: 0,
        tasks
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

    const method = await getMintMethod(data);

    if(method === null) {
        return event.returnValue = {
            error: 1
        }
    }

    return event.returnValue = {
        error: 0,
        obj: method
    }

})

ipcMain.on('add-task', (event, data) => {

    /*
    errors:
    1: invalid wallet id
    2: invalid wallet password
    3: insert error
     */
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

        const account = web3.eth.accounts.decrypt(wallet.encrypted, data.walletPassword);

        const task = new Task(data.contractAddress, account.privateKey, account.address, wallet.id, data.price, data.gas, data.gasLimit, data.functionName, data.args);

        const obj = {
            id: task.id,
            contract_address: task.contract_address,
            publicKey: task.publicKey,
            walletId: task.walletId,
            price: task.price,
            gas: task.gas,
            gasLimit: task.gasLimit,
            functionName: task.functionName,
            args: task.args
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
                tasks: tasks
            }
        });
    })

})

ipcMain.on('delete-task', (event, id) => {

    /*
    errors:
    1: task not found
    3: error while removing
     */

    const task = getTask(id);

    if(task === null) {
        const index = getTaskIndex(id);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: tasks
        }
    }

    db.tasks.find({id: task.id}, function (err, docs) {

        if(err) {

            const index = getTaskIndex(id);
            tasks.splice(index, 1);

            return event.returnValue = {
                error: 1,
                tasks: tasks
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
                    tasks: tasks
                }

            })

        } else {
            return event.returnValue = {
                error: 0,
                tasks: tasks
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

    const task = getTask(id);

    if(task === null) {
        const index = getTaskIndex(id);
        tasks.splice(index, 1);

        return event.returnValue = {
            error: 1,
            tasks: tasks
        }
    }

    if(!task.wallet_loaded) {
        return event.returnValue = {
            error: 2,
            tasks: tasks
        }
    }

    if(task.active) {
        return event.returnValue = {
            error: 3,
            tasks: tasks
        }
    }

    task.start();

    return event.returnValue = {
        error: 0,
        tasks: tasks
    }
})

ipcMain.on('load-tasks', (event, data) => {
    return event.returnValue = tasks;
})

ipcMain.on('gas-price', async (event) => {

    const gas = await web3.eth.getGasPrice();
    const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

    return event.returnValue = {
        gas: web3.utils.fromWei(`${gas}`, 'gwei'),
        gasLimit: web3.utils.fromWei(`${gasLimit}`, 'gwei')
    };
})

function loadWallets() {
    db.wallets.find({}, function(err, docs) {

        if(err) {
            console.log('error while loading wallets');
            return;
        }

        if(docs.length > 0) {
            for(const doc of docs) {
                wallets.push(doc);
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
                const task = new Task(doc.contract_address, null, doc.publicKey, doc.walletId, doc.price, doc.gas, doc.gasLimit, doc.functionName, doc.args);
                task.id = doc.id;
                tasks.push(task);
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
