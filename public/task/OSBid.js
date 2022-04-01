const request = require('async-request');
const {get_web3, machine_id, sendWebhookMessage} = require('../web3_utils');
const {OpenSeaPort, Network, EventType} = require('opensea-js');
const {OrderSide} = require("opensea-js/lib/types");
const HDWalletProvider = require('@truffle/hdwallet-provider/dist/index.js');
const axios = require('axios');
const crypto = require("crypto");
const {getWindow} = require("../window_utils");
const is_dev = require('electron-is-dev');
const log = require('electron-log');
const os_http_endpoint = 'https://eth-mainnet.alchemyapi.io/v2/dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4';

class OSBid {

    constructor({price, tokens, public_key, private_key, contract_address, expiration, schema}) {

        this.id = crypto.randomBytes(16).toString('hex');
        this.price = price;
        this.api_keys = [
            "852d4657fe794045abf12f206af777ad",
            "72fdb7cff7064b70807e0f32d4ec3fa3",
            "d0c85ca2a84143c393992626e26c10f7",
            "d81bee3e75c64ae79541373f4c32295b",
            "57fcc64ba50648d6a93f21a0e05fc1a7",
            "2fe149332c264e008aa46f2fce2301d1",
            "b0fb08d7c8f049009ef4b32440d2c4cc",
            "2e7ef0ac679f4860bbe49a34a98cf5ac",
            "72fdb7cff7064b70807e0f32d4ec3fa3",
            "d0c85ca2a84143c393992626e26c10f7",
            "284ac5f7b70846faa889f8af0bff60c8",
            "d81bee3e75c64ae79541373f4c32295b",
            "54f28eb29db648719c2eaaabccc414fc",
            "2af2cffde08c407590529cdbab8d1646",
            "fd19e5cba6e243719640f90f9f1f1d1e",
            "1a6aaeab958148a3a42d1d801912c91f",
            "790d4e9223714481a11633acbda338de"];
        this.network = '';
        this.throttled = false;
        this.tokens = tokens;
        this.public_key = public_key;
        this.private_key = private_key;
        this.wallet = null;
        this.seaport = null;
        this.count = 0;
        this.contract_address = contract_address;
        this.expiration = expiration;
        this.schema = schema;
        this.bids = [];
    }

    async start() {

        if (this.wallet === null) {
            this.keys = [];
            this.keys.push(this.private_key);
            this.wallet = new HDWalletProvider(this.keys, os_http_endpoint, 0, this.keys.length);
            log.info(`[OSBid] wallet is null, created new one ${this.id}`);
        }

        if (this.seaport === null) {
            this.seaport = new OpenSeaPort(this.wallet, {
                networkName: Network.Mainnet,
                apiKey: this.api_keys[0]
            })

            log.info(`[OSBid] SeaPort is null creating new one ${this.id}`);
        }

        for(const t of this.tokens) {

            await this.bid({
                price: this.price,
                contract_address: this.contract_address,
                token_id: t,
                schema: this.schema,
                account_address: this.public_key,
                expiration: this.expiration
            })

        }

    }

    async bid({price, contract_address, token_id, schema, account_address, expiration}) {

        log.info(`[OSBid] Attempting to bid with...`);

        /*
        0: Not sent yet
        1: Success
        2: Failed
         */

        const bidObj = {
            price: price,
            contract_address: contract_address,
            token_id: token_id,
            expiration: expiration,
            status: 0,
            message: 'Not sent'
        }

        try {
            await this.seaport.createBuyOrder({
                asset: {
                    tokenAddress: contract_address,
                    tokenId: token_id,
                    schemaName: schema
                },
                accountAddress: account_address,
                // Value of the offer, in units of the payment token (or wrapped ETH if none is specified):
                startAmount: price,
                expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * expiration)
            });

            bidObj.status = 1;
            bidObj.message = 'Success';

            log.info(`[OSBid] Successfully bid on asset ${token_id}`);


        } catch(e) {
            bidObj.status = 2;
            bidObj.message = `Error: ${e.message}`;
            log.info(`[OSBid] Could not bid on ${token_id} ${e.message}`);
        }

        this.bids.push(bidObj);
    }


}

module.exports = {
    OSBid
}