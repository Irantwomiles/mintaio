const { sendTransaction, web3 } = require('../web3_utils');
const {mainWindow} = require('../electron');
const crypto = require('crypto');

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
    }

    async start() {

        console.log("inside start");

        if(!this.wallet_loaded) return;

        this.nonce = await web3.eth.getTransactionCount(this.publicKey, "latest");

        const gas = await web3.eth.getGasPrice();
        const gasLimit = (await web3.eth.getBlock("latest")).gasLimit;

        const transaction_promise = sendTransaction(this.contract_address, this.privateKey, this.price, gas, gasLimit, this.nonce, this.args);

        transaction_promise.then((result) => {

            console.log(result);

            mainWindow.webContents.send('task-status-update', {
                error: 0,
                result: result,
                obj: this
            });
        }).catch((error) => {
            console.log("error:", error)

            mainWindow.webContents.send('task-status-update', {
                error: 1,
                result: error,
                obj: this
            });
        })
    }

    get wallet_loaded() {
        return this.privateKey !== null;
    }

}

module.exports = {
    Task
}