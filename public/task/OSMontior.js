// const { web3, http_endpoint } = require('../web3_utils');
// // const {OpenSeaPort, Network, EventType} = require('opensea-js');
// // const {OrderSide} = require("opensea-js/lib/types");
// // const HDWalletProvider = require('../@truffle/hdwallet-provider/dist/index.js');
// const axios = require('axios');
// const crypto = require("crypto");
// const {getWindow} = require("../window_utils");
// const is_dev = require('electron-is-dev');
// const log = require('electron-log');
//
class OSMonitor {

    constructor(contract_address, desired_price, maxGas, priorityFee, private_key, public_key, timer_delay, wallet_id, proxy, webhook) {

    }

    async start() {

    }

    stop() {

    }

//
//     constructor(contract_address, desired_price, maxGas, priorityFee, private_key, public_key, timer_delay, wallet_id, proxy, webhook) {
//
//         this.api_key = '';
//         this.id = crypto.randomBytes(16).toString('hex');
//         this.contract_address = contract_address;
//         this.desired_price = desired_price;
//         this.maxGas = maxGas;
//         this.priorityFee = priorityFee;
//         this.private_key = private_key;
//         this.public_key = public_key;
//         this.timer_delay = timer_delay;
//         this.wallet_id = wallet_id;
//         this.proxy = proxy;
//
//         this.webhook = webhook;
//
//         this.status = {
//             error: -1,
//             result: {
//                 message: "Inactive"
//             }
//         };
//         this.active = false;
//         this.buying = false;
//
//         this.wallet = null;
//
//         this.keys = [];
//         // if(this.private_key !== null) {
//         //     this.keys.push(this.private_key);
//         //     this.wallet = new HDWalletProvider(this.keys, http_endpoint, 0, this.keys.length);
//         // }
//
//         this.seaport = null;
//
//         // if(this.wallet !== null) {
//         //     this.seaport = new OpenSeaPort(this.wallet, {
//         //         networkName: Network.Mainnet,
//         //         apiKey: is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : this.api_key
//         //     })
//         // }
//
//         log.info(`Creating OSMonitor instance ${this.id}`);
//
//     }
//
//     async start() {
//
//         /*
//         Check if wallet is locked
//         Check if this.buying is false before sending a fulfillOrder
//          */
//
//         console.log(this.timer_delay);
//
//         if(isNaN(this.timer_delay)) {
//             return;
//         }
//
//         this.active = true;
//         this.status = {
//             error: 0,
//             result: {
//                 message: `Started`
//             }
//         };
//
//         console.log("Started");
//
//         this.sendMessage('monitor-status-update');
//
//         const delay = Number.parseInt(this.timer_delay);
//
//         console.log("Delay:", delay);
//
//         this.interval = setInterval(() => {
//
//             this.check_erc721(this.contract_address, this.desired_price, is_dev ? "rinkeby-" : "", is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : this.api_key, "");
//
//         }, delay < 1000 ? 1000 : delay);
//     }
//
//     stop() {
//         if(typeof this.interval === 'undefined') {
//             this.active = false;
//             this.status = {
//                 error: 0,
//                 result: {
//                     message: `Inactive`
//                 }
//             };
//
//             this.sendMessage('monitor-status-update');
//             return;
//         }
//
//         clearInterval(this.interval);
//
//         this.interval = undefined;
//         this.buying = false;
//         this.active = false;
//
//         this.status = {
//             error: 0,
//             result: {
//                 message: `Inactive`
//             }
//         };
//
//         this.sendMessage('monitor-status-update');
//     }
//
//     async check_erc721(contract_address, desired_price, network, api_key, proxy) {
//
//         console.log("Checking");
//         // full day
//         const delay = 1000 * 60 * 60 * 24;
//         const updated_value = Date.now() - delay;
//         const date = new Date(updated_value);
//
//         const year = date.getUTCFullYear();
//         const month = date.getUTCMonth() + 1;
//         const day = date.getUTCDate();
//
//         const hour = date.getUTCHours();
//         const minutes = date.getUTCMinutes();
//         const seconds = date.getUTCSeconds();
//
//         const url = `https://${network}api.opensea.io/api/v1/events?event_type=created&asset_contract_address=${contract_address}&occurred_after=${year}-${month > 10 ? month : '0' + month}-${day}T${hour}:${minutes}:${seconds}`;
//
//         console.log(url);
//
//         try {
//             const results = await axios.get(url, {
//                 headers: {
//                     "Accept": "application/json",
//                     "X-API-KEY": api_key
//                 }
//             });
//
//             if(results.status === 200) {
//                 const output = results.data.asset_events;
//
//                 for(const out of output) {
//
//                     if(out.asset === null) continue;
//
//                     const price = Number.parseFloat(web3.utils.fromWei(`${out.starting_price}`, 'ether'));
//                     const payment_token = out.payment_token.id;
//                     const token_id = out.asset.token_id;
//
//                     console.log(payment_token, price);
//
//                     if(payment_token === 2 && price <= desired_price) {
//                         // check to see if this.buying === false
//
//                         if(this.buying) {
//                             console.log("Already attempting to buy something with this wallet, skipping");
//                             return;
//                         }
//                         this.buying = true;
//
//                         this.fill_order(contract_address, token_id);
//
//                         this.status = {
//                             error: 2,
//                             result: {
//                                 message: "Buying"
//                             }
//                         };
//
//                         this.sendMessage('monitor-status-update');
//                         console.log("--------------------------------------------------")
//                     }
//                 }
//             }
//         } catch(e) {
//             console.log("Error:", e.message);
//             this.status = {
//                 error: 1,
//                 result: {
//                     message: e.message
//                 }
//             };
//             this.sendMessage('monitor-status-update');
//         }
//     }
//
//     async fill_order(contract_address, token_id) {
//
//         if(this.private_key === null) {
//             this.status = {
//                 error: 3,
//                 result: {
//                     message: "Unlock Wallet"
//                 }
//             };
//             this.sendMessage('monitor-status-update');
//             return;
//         }
//
//         console.log("Private Key is not null");
//
//         // if(this.wallet === null) {
//         //     this.keys.clear();
//         //     this.keys.push(this.private_key);
//         //     this.wallet = new HDWalletProvider(this.keys, http_endpoint, 0, this.keys.length);
//         // }
//
//         console.log("Wallet is not null");
//
//         // if(this.seaport === null) {
//         //     this.seaport = new OpenSeaPort(this.wallet, {
//         //         networkName: Network.Mainnet,
//         //         apiKey: is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : this.api_key
//         //     })
//         // }
//
//         console.log("Seaport is not null");
//
//         console.log("Attempting to buy ", contract_address, token_id);
//
//         try {
//             const order = await this.seaport.api.getOrder({side: OrderSide.Sell, asset_contract_address: contract_address, token_id: token_id})
//
//             console.log("Got Order");
//
//
//             const weiMax = web3.utils.toWei(this.maxGas, 'gwei');
//             const weiPrio = web3.utils.toWei(this.priorityFee, 'gwei');
//
//             const maxFeePerGas = web3.utils.toHex(weiMax);
//             const maxPriorityFeePerGas = web3.utils.toHex(weiPrio);
//
//
//             // const transaction = await this.seaport.fulfillOrder({order, accountAddress: '0x917062180e5950Dc22b9D5e4E14B61dc2ff0173a', maxFeePerGas, maxPriorityFeePerGas});
//
//             const transaction = await this.seaport.fulfillOrder({order, accountAddress: this.public_key});
//
//             console.log("TransactionHash:", transaction);
//
//         } catch(e) {
//             console.log("ERROR:", e);
//         }
//     }
//
//     sendMessage(channel, data) {
//         getWindow().webContents.send(channel, data);
//     }
//
}

module.exports = {
    OSMonitor
}