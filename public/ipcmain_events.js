const { ipcMain } = require('electron');
const bcrypt = require('bcrypt');
const { web3 } = require('./web3_utils.js');
const crypto = require('crypto');
const { getStorage } = require('./storage');

const db = getStorage();

let wallets = [];

loadWallets();

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

ipcMain.on('load-wallets', (event, data) => {
    return event.returnValue = wallets;
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

/**
 * Returns the wallet with the matching id, null otherwise.
 * @param id | id of the wallet we are looking for.
 * @returns {null|*}
 */
const getWallet = (id) => {
    for(const wallet of wallets) {
        if(wallet.id === id) return wallet;
    }

    return null;
}