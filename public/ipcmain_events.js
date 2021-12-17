const { ipcMain } = require('electron');
const bcrypt = require('bcrypt');
const { web3, web3_logger, getMintMethod, getBalance, validToken } = require('./web3_utils.js');
const crypto = require('crypto');
const { getStorage } = require('./storage');
const { Task } = require('./task/Task');
const axios = require('axios');

const erc721_abi = require("./ERC721-ABI.json");
const {getWindow} = require("./window_utils");

const db = getStorage();

let tasks = [];
let wallets = [];
let mint_logs = [];

let isAuth = false;

loadWallets();
loadTasks();

ipcMain.on('is-auth', (event, data) => {
    return event.returnValue = isAuth;
})

ipcMain.on('auth-user', async (event, data) => {
    const output = await axios.get(`https://mintaio-auth.herokuapp.com/api/${data}`);

    console.log(output.status, output.data);

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
        const out = await getBalance(w.encrypted.address);
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
        tasks: tasks
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
            tasks: tasks
        }
    }


    return event.returnValue = {
        error: 0,
        tasks: tasks
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

            const obj = {
                id: task.id,
                contract_address: task.contract_address,
                publicKey: task.publicKey,
                walletId: task.walletId,
                price: task.price,
                amount: task.amount,
                gas: task.gas,
                gasPriorityFee: task.gasPriorityFee,
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
                    balance: await getBalance(doc.encrypted.address)
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

let log = web3_logger.eth.subscribe('logs', async function(err, result) {
    if(!err) {

        const transaction_receipt = await web3.eth.getTransactionReceipt(result.transactionHash);

        if(transaction_receipt === null) return;

        if(!transaction_receipt.hasOwnProperty('logs')) return;

        if(transaction_receipt.logs && transaction_receipt.logs.length >= 1) {
            const logs = transaction_receipt.logs[0];

            if(!validToken(transaction_receipt.logs)) return;

            if(logs.topics.length === 4) {
                const topic1 = logs.topics[0]; // event
                const topic2 = logs.topics[1]; // from address (0x00..000)
                const topic3 = logs.topics[2]; // to address
                const topic4 = logs.topics[3]; // amount

                if(topic1.toLowerCase() !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'.toLowerCase() || topic2.toLowerCase() !== '0x0000000000000000000000000000000000000000000000000000000000000000') return;

                // if the value is undefined or the tokenId > 12000 skip
                if(typeof topic4 === 'undefined' || topic4 > 12000) return;

                const transaction = await web3.eth.getTransaction(result.transactionHash);
                // console.log(result.transactionHash, transaction.to);

                const contract_address = transaction.to;

                const contract = new web3.eth.Contract(erc721_abi, contract_address);

                let obj = {
                    contract_address: contract_address,
                    name: 'N/A',
                    value: transaction_receipt.logs.length > 0 ? Number.parseFloat(web3.utils.fromWei(transaction.value, 'ether')) / transaction_receipt.logs.length : web3.utils.fromWei(transaction.value, 'ether')
                }

                if(contract !== null) {
                    try{
                        const name = await contract.methods.name().call();
                        obj.name = name;
                    } catch(e) {
                    }
                }

                if(mint_logs.length >= 1000) {
                    mint_logs = [];
                }

                mint_logs.unshift(obj);

                getWindow().webContents.send('mint-watch', mint_logs);

            }

        }

    }
})