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
    constructor(contract_address, privateKey, publicKey, walletId, price, amount, gas, gasPriorityFee, functionName, args) {
        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.walletId = walletId;
        this.price = price;
        this.amount = amount;
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
         4 : ABI not set
         5 : Checking Status
         */
        this.status = {
            error: -1,
            result: {}
        }

        this.abi = null;

        this.start_mode = 'MANUAL'; // MANUAL, AUTOMATIC, TIMER

        this.timer = null;
        this.delay = 0;

        this.contract_status = null; // value of the current state of the smart contract.
        this.contract_status_method = null; // method to check against for automatic starts.
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
        let gasLimit = block.gasLimit / (block.transactions.length > 0 ? block.transactions.length : 1);
        gasLimit = (gasLimit <= 100000 ? Math.ceil(gasLimit + 175000) : 300000) * Number.parseFloat(this.amount);

        const transaction_promise = sendTransaction(
            this.contract_address,
            this.privateKey,
            this.functionName,
            `${web3.utils.toWei(`${this.price}`, 'ether')}`,
            `${web3.utils.toWei(`${gasGwei}`, 'gwei')}`,
            Math.ceil(gasLimit),
            `${web3.utils.toWei(`${this.gasPriorityFee}`, 'gwei')}`,
            this.nonce,
            this.args, this.abi);

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

    async start_timer(delay) {

        if(this.delay === 0) {
            this.start();
            return;
        }

        this.timer = setTimeout(() => {
            this.start();
        }, delay);
    }

    cancel_timer() {
        if(this.timer === null) return;

        clearTimeout(this.timer);
    }

    async start_when_ready() {

        if(this.abi === null) {
            this.status = {
                error: 4,
                result: {}
            };

            this.sendMessage('task-status-update');
            return;
        }

        const contract = new web3.eth.Contract(JSON.parse(this.abi), this.contract_address);

        this.status = {
            error: 5,
            result: {
                message: "Initial"
            }
        };

        this.sendMessage('task-status-update');

        let found = false;

        this.status = {
            error: 5,
            result: {
                message: "Waiting..."
            }
        };

        this.sendMessage('task-status-update');

        this.automatic_interval = setInterval(() => {

            for(let i = 0; i < 30; i++) {

                contract.methods[this.contract_status_method]().call({defaultBlock: 'pending'}).then((result) => {

                    if(`${result}`.toLowerCase() !== `${this.contract_status}`.toLowerCase()) {
                        clearInterval(this.automatic_interval);

                        if(found) return;

                        found = true;
                        this.start();
                    }
                });
            }

        }, 1000 * 1);

        this.start();
    }

    stop_automatic() {

        if(this.automatic_interval) {

            if(this.status.error === 3) return;

            clearInterval(this.automatic_interval);

            this.status = {
                error: -1,
                result: {
                    message: "Inactive"
                }
            };

            this.sendMessage('task-status-update');

        }

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