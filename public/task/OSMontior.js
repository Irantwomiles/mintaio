const {web3, os_http_endpoint, machine_id, sendWebhookMessage} = require('../web3_utils');
const {OpenSeaPort, Network, EventType} = require('opensea-js');
const {OrderSide} = require("opensea-js/lib/types");
const HDWalletProvider = require('@truffle/hdwallet-provider/dist/index.js');
const axios = require('axios');
const crypto = require("crypto");
const {getWindow} = require("../window_utils");
const is_dev = require('electron-is-dev');
const log = require('electron-log');
const request = require('request');

class OSMonitor {

    constructor(slug, desired_price, maxGas, priorityFee, private_key, public_key, timer_delay, wallet_id, proxy, webhook) {

        this.throttled = [];
        this.api_key = [];
        this.id = crypto.randomBytes(16).toString('hex');
        this.slug = slug;
        this.desired_price = desired_price;
        this.maxGas = maxGas;
        this.priorityFee = priorityFee;
        this.private_key = private_key;
        this.public_key = public_key;
        this.timer_delay = timer_delay;
        this.wallet_id = wallet_id;
        this.proxy = proxy;

        this.proxies = [
            "154.207.4.115:5628:HEUDCHEFD:DCMWIDOF",
            "154.207.4.110:5628:HEUDCHEFD:DCMWIDOF",
            "154.207.4.137:5628:HEUDCHEFD:DCMWIDOF",
            "154.207.4.114:5628:HEUDCHEFD:DCMWIDOF",
            "154.207.6.176:5628:dRyd9qcq:dKsB8nHJ",
            "154.207.6.177:5628:dRyd9qcq:dKsB8nHJ",
            "154.207.6.178:5628:dRyd9qcq:dKsB8nHJ",
            "154.207.6.179:5628:dRyd9qcq:dKsB8nHJ",
            "154.207.6.180:5628:dRyd9qcq:dKsB8nHJ"
        ];

        this.webhook = webhook;

        this.status = {
            error: -1,
            result: {
                message: "Inactive"
            }
        };
        this.active = false;
        this.buying = false;

        this.wallet = null;
        this.seaport = null;

        this.keys = [];


        log.info(`[OSMonitor] Creating OSMonitor instance ${this.id}`);

        /*
        -1: Inactive
         0: Found order
         1: Bought successfully
         2: Error
         3: Searching...
         4: Unlock Wallet
         5: Started
         */

    }

    async start() {

        /*
        Check if wallet is locked
        Check if this.buying is false before sending a fulfillOrder
         */

        log.info(`Starting monitor ${this.id}`);

        if (this.api_key.length === 0) {
            this.api_key = (await axios.get(`https://mintaio-auth.herokuapp.com/os/keys/${machine_id}`)).data;

            log.info(`[OSMonitor] API Key not found, fetching`);
        }

        if (isNaN(this.timer_delay)) {
            log.info(`[OSMonitor] timer_delay is NaN ${this.id}`);
            return;
        }

        this.active = true;
        this.buying = false;

        this.status = {
            error: 5,
            result: {
                message: 'Started'
            }
        };

        this.sendMessage('monitor-status-update');

        const delay = Number.parseInt(this.timer_delay);

        log.info(`[OSMonitor] Starting with delay ${delay} ${this.id}`);

        this.status = {
            error: 3,
            result: {
                message: 'Checking'
            }
        };

        this.interval = setInterval(() => {
            let _key = '';

            if(this.api_key.length > 0) {
                _key = this.api_key.shift();
                this.throttled.push(_key);
            } else if(this.throttled.length > 0) {
                this.api_key = [...this.throttled];
                this.throttled = [];

                _key = this.api_key.shift();
                this.throttled.push(_key);
            }

            this.get_asset(this.slug, this.desired_price, 10, _key,is_dev ? "rinkeby-" : "");

        }, delay < 1000 ? 1000 : delay);
    }

    stop() {
        if (typeof this.interval === 'undefined') {
            this.active = false;
            this.status = {
                error: -1,
                result: {
                    message: 'Inactive'
                }
            };

            this.sendMessage('monitor-status-update');
            return;
        }

        clearInterval(this.interval);

        this.interval = undefined;
        this.buying = false;
        this.active = false;

        this.status = {
            error: -1,
            result: {
                message: 'Inactive'
            }
        };

        this.sendMessage('monitor-status-update');
    }

    async get_asset(slug, desired_price, time, _key, network) {

        try {

            const p = this.proxies[Math.floor(Math.random() * this.proxies.length)].split(':');
            const username = p[2], password = p[3], host = p[0], port = p[1];

            console.log(`Checking using ${host}:${port}:${username}:${password}`);

            log.info(`[OSMonitor] Checking ${this.slug}`);

            const delay = 1000 * 60 * 60 * time;
            const updated_value = Date.now() - delay;
            const date = new Date(updated_value);

            const year = date.getUTCFullYear();
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();

            const hour = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const seconds = date.getUTCSeconds();

            const url = `https://${network}api.opensea.io/api/v1/events?event_type=created&collection_slug=${slug}&occurred_after=${year}-${month > 10 ? month : '0' + month}-${day}T${hour}:${minutes}:${seconds}`;

            console.log(url);

            request({
                method: 'GET',
                timeout: 3000,
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                    "Accept": "application/json",
                    "X-API-KEY": is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : _key
                },
                proxy: `http://${username}:${password}@${host}:${port}`
            }, (err, res, body) => {
                if (err) {
                    console.log("Error:", `${host}:${port}:${username}:${password}`, err);
                    log.info("[OSMonitor] Error(1)", err, _key);
                    return;
                }

                if (res.statusCode !== 200) {
                    log.info("[OSMonitor] Error(1) status", res.statusCode, body, _key);
                    return;
                }

                const data = JSON.parse(body);

                const output = data.asset_events;

                if (output.length === 0) {
                    log.info("[OSMonitor] Checking listed items, found 0");
                    return;
                }

                let token_ids_query = '';
                let address = '';

                for (const out of output) {

                    if (out.asset === null) continue;

                    const price = Number.parseFloat(web3.utils.fromWei(`${out.starting_price}`, 'ether'));
                    const payment_token = out.payment_token.id;
                    const token_id = out.asset.token_id;
                    const contract_address = out.asset.asset_contract.address;
                    const listing_duration = out.duration;

                    address = contract_address;

                    // console.log(`payment_token: ${payment_token} price: ${price} listing_duration: ${listing_duration}`);

                    /*
                    Payment type must be Ethereum, price must be <= desired price, and listing duration must be longer than 10 minutes.
                     */
                    //(is_dev ? 2 : 1)

                    if (payment_token === 1 && price <= desired_price && listing_duration > 600) {

                        console.log("PRICE:", price, token_id)

                        token_ids_query += `&token_ids=${token_id}`;
                        console.log("--------------------------------------------------")
                    }
                }

                if (token_ids_query.length === 0) return;

                const asset_url = `https://${network}api.opensea.io/api/v1/assets?asset_contract_address=${address}${token_ids_query}`

                console.log("asset_url", asset_url);

                log.info("[OSMonitor] Checking listed items, found", output.length, "status", res.statusCode);

                request({
                    method: 'GET',
                    timeout: 3000,
                    url: asset_url,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
                        "Accept": "application/json",
                        "X-API-KEY": is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : _key
                    },
                    proxy: `http://${username}:${password}@${host}:${port}`
                }, async (err, res, body) => {

                    if (err) {
                        console.log("AssetError:", `${host}:${port}:${username}:${password}`, err);
                        log.info("[OSMonitor] Error(2)", err, body, _key);
                        return;
                    }

                    if (res.statusCode !== 200) {
                        log.info("[OSMonitor] Error(2) status", res.statusCode, _key);
                        return;
                    }

                    const data = JSON.parse(body);
                    const output = data.assets;

                    for (const asset of output) {

                        if (asset.sell_orders === null) {
                            continue;
                        }

                        const contract = asset.asset_contract.address;
                        const token_id = asset.token_id;

                        if (this.buying) {
                            console.log("Already Buying NFT");
                            log.info(`[OSMonitor] Already buying contract:${contract} token_id:${token_id}`);
                            return;
                        }

                        await this.fill_order(contract, token_id);

                    }

                })

            })

        } catch (e) {
            console.log("Error:", e.message);
        }
    }

    async fill_order(contract_address, token_id) {
        try {

            console.log("Found order ", contract_address, token_id);

            if (this.private_key === null) {
                this.status = {
                    error: 4,
                    result: {
                        message: "Unlock Wallet"
                    }
                };

                log.info(`[OSMonitor] fill_order must unlock wallet ${this.id}`);

                this.sendMessage('monitor-status-update');
                return;
            }

            if (this.wallet === null) {
                this.keys = [];
                this.keys.push(this.private_key);
                this.wallet = new HDWalletProvider(this.keys, os_http_endpoint, 0, this.keys.length);
                log.info(`[OSMonitor] fill_order wallet is null, created new one ${this.id}`);
            }

            if (this.seaport === null) {
                this.seaport = new OpenSeaPort(this.wallet, {
                    networkName: is_dev ? Network.Rinkeby : Network.Mainnet,
                    apiKey: is_dev ? "2f6f419a083c46de9d83ce3dbe7db601" : this.api_key[Math.floor(Math.random() * this.api_key.length)]
                })

                log.info(`[OSMonitor] fill_order SeaPort is null creating new one ${this.id}`);
            }

            const order = await this.seaport.api.getOrder({
                side: OrderSide.Sell,
                asset_contract_address: contract_address,
                token_id: token_id
            })

            log.info(`[OSMonitor] Got order ${this.id}`);

            this.status = {
                error: 0,
                result: {
                    message: "Found Order"
                }
            };
            this.sendMessage('monitor-status-update');

            const weiMax = web3.utils.toWei(this.maxGas, 'gwei');
            const weiPrio = web3.utils.toWei(this.priorityFee, 'gwei');

            const maxFeePerGas = web3.utils.toHex(weiMax);
            const maxPriorityFeePerGas = web3.utils.toHex(weiPrio);

            clearInterval(this.interval);

            log.info(`[OSMonitor] clearedInterval, sending Tx using gas M:${maxFeePerGas} P:${maxPriorityFeePerGas} ${this.id}`);
            this.buying = true;

            try {
                const transaction = await this.seaport.fulfillOrder({
                    order,
                    accountAddress: this.public_key,
                    maxGas: maxFeePerGas,
                    priorityFee: maxPriorityFeePerGas
                });
                sendWebhookMessage({
                    title: 'OpenSea Sniper',
                    description: `Successfully Bought\n${transaction}`,
                    color: '3135616'
                })

                this.status = {
                    error: 1,
                    result: {
                        message: "Bought Successfully"
                    }
                };
                this.sendMessage('monitor-status-update');

                log.info(`[OSMonitor] successfully bought TxHash: ${transaction} ${this.id}`);

            } catch (e) {
                console.log("Testing This:", e);
            }

            this.interval = undefined;
            this.active = false;

        } catch (e) {
            console.log("ERROR:", e);
            this.status = {
                error: 2,
                result: {
                    message: e.message
                }
            };

            log.info(`[OSMonitor] Error in fill_order ${e.message} ${this.id}`);
        }
    }

    sendMessage(channel, data) {
        getWindow().webContents.send(channel, data);
    }

}

module.exports = {
    OSMonitor
}