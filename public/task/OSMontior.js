const { web3 } = require('../web3_utils');
const axios = require('axios');
const crypto = require("crypto");

class OSMonitor {

    constructor(contract_address, desired_price, maxGas, priorityFee, private_key, public_key, wallet_id, proxy, webhook) {

        this.id = crypto.randomBytes(16).toString('hex');
        this.contract_address = contract_address;
        this.desired_price = desired_price;
        this.maxGas = maxGas;
        this.priorityFee = priorityFee;
        this.private_key = private_key;
        this.public_key = public_key;
        this.wallet_id = wallet_id;
        this.proxy = proxy;
        this.webhook = webhook;

        this.status = "Inactive";
    }

    async check_erc721(contract_address, desired_price, network, api_key) {
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

                    console.log(out.asset.permalink, price);
                    console.log("--------------------------------------------------")
                }
            }
        } else {
            console.log(results.status);
        }

    }

}

module.exports = {
    OSMonitor
}