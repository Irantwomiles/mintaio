const { get_imported_functions, get_web3, mintSuccessMessage, waitingMessage, mintErrorMessage} = require('../web3_utils');
const {start_status_watch} = require('../subscriptions');
const is_dev = require('electron-is-dev');
const crypto = require('crypto');
const {getWindow} = require('../window_utils');
const log = require('electron-log');

const mintaio_webhook = 'https://discord.com/api/webhooks/935664893137395722/hjjlfw6Z46l8szcIY09NGq2n0fZ5d7hY2CKDr2QBwMe0HTbVMAFGLCsyfokwbBCdCrDZ';
const mintaio_webhook_dev = 'https://discord.com/api/webhooks/940036419890597949/XjjgpAyMvxPPoCXHo71xuye2jeyaaro7xqtBayo9lO01FGx_U8ThE3GPQXcKN97fbcWP';

class Task {

    /**
     *
     * @param contract_address | Contract address of the NFT
     * @param account | Account object of the wallet that is to be used to mint this NFT
     * @param price | Price in ETH (Should account for how many you are buying ex: 1 = 0.06 -> 4 = 0.24)
     */
    constructor(contract_address, privateKey, publicKey, walletId, price, amount, gas, gasPriorityFee, gasLimit, functionName, args) {
        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        this.walletId = walletId;
        this.price = price;
        this.amount = amount;
        this.gas = gas;
        this.gasPriorityFee = gasPriorityFee;
        this.gasLimit = gasLimit;
        this.functionName = functionName;
        this.args = args;
        this.nonce = null;
        this.active = false;
        this.contract_creator = '';

        /*
        Status:
        -1 : Inactive
        0 : Starting
        1 : Success
        2 : Error
        3 : pending
        4 : ABI not set
        5 : Checking Status
        6 : Waiting (block)
        7 : No Timestamp
        8 : Timestamp NaN
        9 : Checking Block (Use message)
        10: Found Block (Use message)
        11: Contract not set
        12: Contract creator not set
        13: Waiting for Tx in mempool
        14: Status watch is already running
         */
        this.status = {
            error: -1,
            result: {}
        }

        this.abi = null;

        this.start_mode = 'MANUAL'; // MANUAL, AUTOMATIC, TIMER

        this.timestamp = "";

        this.contract_status = ""; // value of the current state of the smart contract.
        this.contract_status_method = ""; // method to check against for automatic starts.

        this.imported_functions = null;

        this.webhook = "";
    }

    async activate() {

        log.info(`Started task ${this.id}`);

        if(this.start_mode === "MANUAL") {
            this.start();
        } else if(this.start_mode === "TIMER") {
            this.start_timer();
            console.log("Starting Timer Mode");
        } else if(this.start_mode === "AUTOMATIC") {
            this.start_when_ready();
        }
        /*else if(this.start_mode === "FIRST_BLOCK") {

            if(this.contract_creator.length === 0) {
                this.status = {
                    error: 12,
                    result: ''
                };

                this.sendMessage('task-status-update');
                return;
            }

            const output = start_status_watch();

            if(output.error === 1) {
                this.status = {
                    error: 14,
                    result: ''
                };

                this.sendMessage('task-status-update');
            } else {
                this.status = {
                    error: 13,
                    result: ''
                };

                this.sendMessage('task-status-update');
            }
        }*/

    }

    async start() {

        if(!this.wallet_loaded) return;

        if(this.active) return;

        if(this.abi === null) {
            this.status = {
                error: 4,
                result: {}
            };

            this.sendMessage('task-status-update');
            return;
        }

        if(this.imported_functions === null) {
            this.imported_functions = get_imported_functions();
        }

        this.active = true;

        this.nonce = await get_web3().eth.getTransactionCount(this.publicKey, "latest");

        waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Creating transaction', 13999634, is_dev ? mintaio_webhook_dev : mintaio_webhook);

        if(this.webhook.length > 0) {
            waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Creating transaction', 13999634, this.webhook);
        }

        log.info(`Creating transaction ${this.id}`);

        this.status = {
            error: 0,
            result: {}
        };

        this.sendMessage('task-status-update');

        let gasGwei = '0';

        if(this.gas === -1) {
            this.gas = await get_web3().eth.getGasPrice();
            gasGwei = get_web3().utils.fromWei(`${this.gas}`, 'gwei');
        } else {
            gasGwei = this.gas;
        }

        const transaction_promise = this.imported_functions.sendTransaction(
            get_web3(),
            this.contract_address,
            this.privateKey,
            this.functionName,
            `${get_web3().utils.toWei(`${this.price}`, 'ether')}`,
            `${get_web3().utils.toWei(`${gasGwei}`, 'gwei')}`,
            `${get_web3().utils.toWei(`${this.gasPriorityFee}`, 'gwei')}`,
            Number.parseInt(`${this.gasLimit}`),
            this.nonce,
            this.args,
            this.abi,
            log);

        this.status = {
            error: 3,
            result: {}
        };

        this.sendMessage('task-status-update');

        waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Sent transaction', 13999634, is_dev ? mintaio_webhook_dev : mintaio_webhook);

        if(this.webhook.length > 0) {
            waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Sent transaction', 13999634, this.webhook);
        }

        log.info(`Sent transaction ${this.id}`);

        transaction_promise.then( async (result) => {

            this.status = {
                error: 1,
                result: result
            };

            this.sendMessage('task-status-update', result);

            const tx = await get_web3().eth.getTransaction(result.transactionHash);
            const _price = get_web3().utils.fromWei(tx.value, 'ether');
            const _maxGas = get_web3().utils.fromWei(tx.maxFeePerGas, 'gwei');
            const _priority = get_web3().utils.fromWei(tx.maxPriorityFeePerGas, 'gwei');

            mintSuccessMessage(this.contract_address, result.transactionHash, _price, _maxGas, _priority, is_dev ? mintaio_webhook_dev : mintaio_webhook);

            if(this.webhook.length > 0) {
                mintSuccessMessage(this.contract_address, result.transactionHash, _price, _maxGas, _priority, this.webhook);
            }

            log.info(`Minted successfully ${this.id}`);

            this.active = false;
        }).catch((error) => {
            this.status = {
                error: 2,
                result: error
            };

            this.sendMessage('task-status-update', error);

            mintErrorMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Sent transaction', error.message, is_dev ? mintaio_webhook_dev : mintaio_webhook);

            if(this.webhook.length > 0) {
                mintErrorMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Sent transaction', error.message, this.webhook);
            }

            log.info(`Error in transaction ${this.contract_address} ${this.id}`);

            this.active = false;
        })
    }

    async start_timer() {

        // task is already started
        if(typeof this.block_timer !== 'undefined') {
            return;
        }

        // timestamp not set
        if(this.timestamp.length === 0) {

            this.status = {
                error: 7,
                result: {
                    message: `No Timestamp`
                }
            };

            this.sendMessage('task-status-update');
            return;
        }

        // timestamp must be a number
        if(isNaN(this.timestamp)) {
            this.status = {
                error: 8,
                result: {
                    message: `Timestamp NaN`
                }
            };
            this.sendMessage('task-status-update');
            return;
        }

        const _timestamp = Number.parseInt(this.timestamp);
        let found = false;

        this.status = {
            error: 6,
            result: {
                message: `Waiting...`
            }
        };
        this.sendMessage('task-status-update');

        this.block_timer = setInterval(() => {
            for(let i = 0; i < 2; i++) {

                get_web3().eth.getBlock('latest').then((data) => {

                    this.status = {
                        error: 9,
                        result: {
                            message: `Block: ${data.number}`
                        }
                    };
                    this.sendMessage('task-status-update');

                    if((data.timestamp + (10 * 1000)) >= _timestamp) {

                        clearInterval(this.block_timer);

                        if(found) return;

                        this.start();
                        found = true;

                        this.status = {
                            error: 10,
                            result: {
                                message: `Found: ${data.number}`
                            }
                        };
                        this.sendMessage('task-status-update');

                    }
                }).catch(error => {
                    console.log("Error occured while fetching latest block.");
                })

            }
        }, 1000 * 1);



    }

    cancel_timer() {

        if(typeof this.block_timer === 'undefined') return;

        clearInterval(this.block_timer);
        this.block_timer = undefined;

        this.status = {
            error: -1,
            result: {
                message: `Inactive`
            }
        };

        this.sendMessage('task-status-update');
    }

    async start_when_ready() {

        if(typeof this.automatic_interval !== 'undefined') {
            log.info(`Interval already running ${this.contract_address} ${this.id}`);
            return;
        }

        if(this.contract_status_method.length === 0) {
            this.status = {
                error: 11,
                result: {
                    message: `Missing Values`
                }
            };

            this.sendMessage('task-status-update');
            return;
        }

        if(this.contract_status.length === 0) {
            this.status = {
                error: 11,
                result: {
                    message: `Missing Values`
                }
            };

            this.sendMessage('task-status-update');
            return;
        }

        if(this.abi === null) {
            this.status = {
                error: 4,
                result: {}
            };

            this.sendMessage('task-status-update');
            return;
        }

        const contract = new (get_web3()).eth.Contract(JSON.parse(this.abi), this.contract_address);

        let found = false;

        this.status = {
            error: 5,
            result: {
                message: `Waiting...`
            }
        };

        this.sendMessage('task-status-update');

        waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Waiting', 4951747, is_dev ? mintaio_webhook_dev : mintaio_webhook);

        if(this.webhook.length > 0) {
            waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Waiting', 4951747, this.webhook);
        }

        log.info(`Waiting for contract to go live ${this.contract_address} ${this.id}`);

        this.automatic_interval = setInterval(() => {

            for(let i = 0; i < 5; i++) {

                contract.methods[this.contract_status_method]().call({defaultBlock: 'pending'}).then((result) => {

                    if(`${result}`.toLowerCase() !== `${this.contract_status}`.toLowerCase()) {
                        clearInterval(this.automatic_interval);
                        this.automatic_interval = undefined;

                        if(found) {
                            return;
                        }

                        waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Project is live', 12591347, is_dev ? mintaio_webhook_dev : mintaio_webhook);

                        if(this.webhook.length > 0) {
                            waitingMessage(this.contract_address, this.publicKey, this.price, this.amount, this.gas, this.gasPriorityFee, 'Project is live', 12591347, this.webhook);
                        }

                        log.info(`Contract is live ${this.contract_address} ${this.id}`);

                        found = true;
                        this.start();
                    }
                }).catch(error => {
                    console.log("error occured while fetching latest contract data");
                })
            }

        }, 1000 * 1);
    }

    stop_automatic() {

        if(typeof this.automatic_interval === "undefined") {
            return;
        }

        if(this.status.error === 3) return;

        clearInterval(this.automatic_interval);
        this.automatic_interval = undefined;

        this.status = {
            error: -1,
            result: {
                message: `Inactive`
            }
        };

        log.info(`Stopped task ${this.id}`);

        this.sendMessage('task-status-update');

    }

    get wallet_loaded() {
        return this.privateKey !== null;
    }

    sendMessage(channel, data) {
        getWindow().webContents.send(channel, data);
    }

    is_on_timer() {
        return (typeof this.block_timer !== 'undefined' || typeof this.automatic_interval !== 'undefined');
    }

}

module.exports = {
    Task
}