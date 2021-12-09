const { sendTransaction, web3 } = require('../web3_utils');
const crypto = require('crypto');
const {getWindow} = require('../window_utils');

class Task {

    /**
     *
     * @param contract_address | Contract address of the NFT
     * @param account | Account object of the wallet that is to be used to mint this NFT
     * @param price | Price in ETH (Should account for how many you are buying ex: 1 = 0.06 -> 4 = 0.24)
     */
    constructor(contract_address, privateKey, publicKey, walletId, price, gas, gasPriorityFee, functionName, args) {
        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.walletId = walletId;
        this.price = price;
        this.gas = gas;
        this.gasPriorityFee = gasPriorityFee;
        this.functionName = functionName;
        this.args = args;
        this.nonce = null;
        this.active = false;
        /*
        Status:
        -1 : Inactive
         0 : Starting
         1 : Success
         2 : Error
         3 : pending
         */
        this.status = {
            error: -1,
            result: {}
        }
    }

    async start() {

        if(!this.wallet_loaded) return;

        if(this.active) return;

        this.active = true;

        if(this.nonce == null) {
            this.nonce = await web3.eth.getTransactionCount(this.publicKey, "latest");
        } else {
            this.nonce++;
        }

        this.status = {
            error: 0,
            result: {}
        };

        this.sendMessage('task-status-update');

        let gasGwei = '0';

        if(this.gas === -1) {
            this.gas = await web3.eth.getGasPrice();
            gasGwei = web3.utils.fromWei(`${this.gas}`, 'gwei');
        } else {
            gasGwei = this.gas;
        }

        const block = await web3.eth.getBlock("latest");
        const gasLimit = block.gasLimit / (block.transactions.length > 0 ? block.transactions.length : 1);

        const transaction_promise = sendTransaction(
            this.contract_address,
            this.privateKey,
            this.functionName,
            `${web3.utils.toWei(`${this.price}`, 'ether')}`,
            `${web3.utils.toWei(`${gasGwei}`, 'gwei')}`,
            gasLimit <= 100000 ? Math.ceil(gasLimit + 150000) : 300000,
            `${web3.utils.toWei(`${this.gasPriorityFee}`, 'gwei')}`,
            this.nonce,
            this.args);

        this.status = {
            error: 3,
            result: {}
        };

        this.sendMessage('task-status-update');

        transaction_promise.then((result) => {

            this.status = {
                error: 1,
                result: result
            };

            this.sendMessage('task-status-update', result);

            this.active = false;
        }).catch((error) => {
            this.status = {
                error: 2,
                result: error
            };

            this.sendMessage('task-status-update', error);

            this.active = false;
        })
    }

    get wallet_loaded() {
        return this.privateKey !== null;
    }

    sendMessage(channel, data) {
        getWindow().webContents.send(channel, data);
    }

}

module.exports = {
    Task
}