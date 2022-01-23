const { web3 } = require('../web3_utils');
const axios = require('axios');
const crypto = require("crypto");
const {getWindow} = require("../window_utils");

class OSMonitor {

    constructor(contract_address, desired_price, maxGas, priorityFee, private_key, public_key, timer_delay, wallet_id, proxy, webhook) {

        this.api_key = '852d4657fe794045abf12f206af777ad';
        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.desired_price = desired_price;
        this.maxGas = maxGas;
        this.priorityFee = priorityFee;
        this.private_key = private_key;
        this.public_key = public_key;
        this.timer_delay = timer_delay;
        this.wallet_id = wallet_id;
        this.proxy = proxy;
        this.webhook = webhook;

        this.status = {
            error: -1,
            result: {
                message: "Inactive"
            }
        };
        this.active = false;
        this.buying = false;
    }

    async start() {

        /*
        Check if wallet is locked
        Check if this.buying is false before sending a fulfillOrder
         */

        console.log(this.timer_delay);

        if(isNaN(this.timer_delay)) {
            return;
        }

        this.active = true;
        this.status = {
            error: 0,
            result: {
                message: `Started`
            }
        };

        console.log("Started");

        this.sendMessage('monitor-status-update');

        const delay = Number.parseInt(this.timer_delay);

        console.log("Delay:", delay);

        this.interval = setInterval(() => {

            this.check_erc721(this.contract_address, this.desired_price, "", this.api_key, "");

        }, delay < 1000 ? 1000 : delay);
    }

    async check_erc721(contract_address, desired_price, network, api_key, proxy) {

        console.log("Checking");

        const delay = 1000 * 60 * 2;
        const updated_value = Date.now() - delay;
        const date = new Date(updated_value);

        const year = date.getUTCFullYear();
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();

        const hour = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();

        const url = `https://${network}api.opensea.io/api/v1/events?event_type=created&asset_contract_address=${contract_address}&occurred_after=${year}-${month > 10 ? month : '0' + month}-${day}T${hour}:${minutes}:${seconds}`;

        try {
            const results = await axios.get(url, {
                headers: {
                    "Accept": "application/json",
                    "X-API-KEY": api_key
                }
            });

            if(results.status === 200) {
                const output = results.data.asset_events;

                for(const out of output) {

                    if(out.asset === null) continue;

                    const price = Number.parseFloat(web3.utils.fromWei(`${out.starting_price}`, 'ether'));
                    const payment_token = out.payment_token.id;

                    console.log(payment_token, price);

                    if(payment_token === 1 && price <= desired_price) {
                        // check to see if this.buying === false
                        this.status = {
                            error: 2,
                            result: {
                                message: "Buying"
                            }
                        };
                        console.log("--------------------------------------------------")
                    }
                }
            }
        } catch(e) {
            console.log("Error:", e.message);
            this.status = {
                error: 1,
                result: {
                    message: e.message
                }
            };
            this.sendMessage('monitor-status-update');
        }
    }

    sendMessage(channel, data) {
        getWindow().webContents.send(channel, data);
    }

}

module.exports = {
    OSMonitor
}