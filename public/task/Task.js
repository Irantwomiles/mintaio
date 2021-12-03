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
    constructor(contract_address, privateKey, publicKey, walletId, price, gas, gasLimit, functionName, args) {
        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.walletId = walletId;
        this.price = price;
        this.gas = gas;
        this.gasLimit = gasLimit;
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
         */
        this.status = -1;
    }

    async start() {

        if(!this.wallet_loaded) return;

        this.active = true;

        this.nonce = await web3.eth.getTransactionCount(this.publicKey, "latest");

        this.status = 0;

        this.sendMessage('task-status-update');

        const gas = await web3.eth.getGasPrice();
        const gasGwei = Number.parseFloat(web3.utils.fromWei(`${gas}`, 'gwei'));

        const block = await web3.eth.getBlock("latest");
        const gasLimit = block.gasLimit / block.transactions.length;

        const transaction_promise = sendTransaction(this.contract_address, this.privateKey, this.price, web3.utils.toWei(`${gasGwei}`, 'gwei'), Math.ceil(gasLimit), this.nonce, this.args);

        this.status = 3;

        this.sendMessage('task-status-update');

        transaction_promise.then((result) => {

            this.status = 1;

            this.sendMessage('task-status-update', result);

            this.active = false;
        }).catch((error) => {
            this.status = 2;

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