const request = require('async-request');
const {get_web3, os_http_endpoint, machine_id, sendWebhookMessage} = require('../web3_utils');
const {OpenSeaPort, Network, EventType} = require('opensea-js');
const {OrderSide} = require("opensea-js/lib/types");
const HDWalletProvider = require('@truffle/hdwallet-provider/dist/index.js');
const axios = require('axios');
const crypto = require("crypto");
const {getWindow} = require("../window_utils");
const is_dev = require('electron-is-dev');
const log = require('electron-log');

class OSBid {

    constructor(slug, trait) {

        this.traitsMap = new Map();
        this.count = 0;
        this.proxies = [
            "199.187.188.185:10742:dzyamayd:gzP4w13qT0",
            "199.187.190.31:10160:dzyamayd:gzP4w13qT0",
            "199.187.188.240:11838:dzyamayd:gzP4w13qT0",
            "199.187.191.125:11893:dzyamayd:gzP4w13qT0",
            "199.187.188.122:12070:dzyamayd:gzP4w13qT0"];
        this.api_keys = [];
        this.network = '';
        this.throttled = false;

        this.slug = slug;
        this.trait = trait;
        this.global_cursor = '';
    }

    // async bid({contract_address, token_id, schema, account_address, expiration}) {
    //
    //     console.log(`Attempting to bid with...`);
    //
    //     try {
    //         const offer = await seaport.createBuyOrder({
    //             asset: {
    //                 tokenAddress: contract_address,
    //                 tokenId: token_id,
    //                 schemaName: schema
    //             },
    //             accountAddress: account_address,
    //             // Value of the offer, in units of the payment token (or wrapped ETH if none is specified):
    //             startAmount: 0.015,
    //             expirationTime: Math.round(Date.now() / 1000 + 60 * 60 * expiration)
    //         });
    //
    //         console.log("Successfully bid on asset", token_id);
    //
    //
    //     } catch(e) {
    //         console.log("Could not bid on", token_id, e.message);
    //     }
    // }


}