const axios = require('axios');
const is_dev = require('electron-is-dev');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const fs = require('fs');
const log = require('electron-log');

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

let json_value = {
    primary_key: "dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4",
    secondary_key: "22SFODSbXp_n6Zedhj_4w1o5M4FmS-C_"
}

if(fs.existsSync(`${dataPath}\\mintaio\\api_keys.json`)) {
    const output = fs.readFileSync(`${dataPath}\\mintaio\\api_keys.json`);
    json_value = JSON.parse(output);
}

const primary_key = json_value.primary_key;
const secondary_key = json_value.secondary_key;

const websocket_key         = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;
const websocket_key_logger  = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/${secondary_key}`;
// const http_endpoint = `https://eth-${is_dev ? 'rinkeby' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;
const http_endpoint = `https://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;

// const os_http_endpoint = `https://eth-${is_dev ? 'rinkeby' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;
const os_http_endpoint = `https://eth-mainnet.alchemyapi.io/v2/${primary_key}`;

const erc721_abi = require('./ERC721-ABI.json');

const web3 = createAlchemyWeb3(http_endpoint);
const web3_logger = createAlchemyWeb3(websocket_key_logger);

const requireFromWeb = require('require-from-web');
const id = require('node-machine-id');

const machine_id = id.machineIdSync();

const url = `https://mintaio-auth.herokuapp.com/api/files/${machine_id}/modules.js`;
// const url = `http://localhost:1458/api/files/${machine_id}/modules.js`;

const modules = requireFromWeb(url);

function validToken(logs) {
    for(const log of logs) {

        const topics = log.topics;

        if(topics.length === 4) {

            const topic1 = log.topics[0]; // event
            const topic2 = log.topics[1]; // from address (0x00..000)

            if(topic1.toLowerCase() !== '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'.toLowerCase() || topic2.toLowerCase() !== '0x0000000000000000000000000000000000000000000000000000000000000000') return false;
        } else {
            return false;
        }
    }

    return true;
}

async function sendWebhookMessage(input) {

    try {
        const message = {
            "embeds": [
                {
                    "title": input.title,
                    "description": input.description,
                    "color": input.color
                }
            ]
        }

        await axios.post('https://discord.com/api/webhooks/935664893137395722/hjjlfw6Z46l8szcIY09NGq2n0fZ5d7hY2CKDr2QBwMe0HTbVMAFGLCsyfokwbBCdCrDZ', JSON.stringify(message), {
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch {

    }

}

async function mintSuccessMessage(contract_address, tx_hash, price, max_gas, priority_fee, webhook) {

    try {
        const message = {
            "embeds": [
                {
                    "title": "Successfully Minted!",
                    "description": `Project: [View on etherscan](https://etherscan.io/address/${contract_address})  Transaction: [View on etherscan](https://etherscan.io/tx/${tx_hash})\n\n**Price**: ${price} ETH\n**Max Gas:** ${max_gas} | **Priority Fee:** ${priority_fee}`,
                    "color": 3135616,
                    "author": {
                        "name": "MintAIO",
                        "url": "https://twitter.com/MintAIO_"
                    }
                }
            ]
        }

        await axios.post(webhook, JSON.stringify(message), {
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch {

    }
}

async function waitingMessage(contract_address, sender, price, amount, max_gas, priority_fee, status, color, webhook) {

    try {
        const message = {
            "embeds": [
                {
                    "title": "MintAIO",
                    "description": `**Status:** ${status} | **Mode:** Automatic\n**Project**: [View on etherscan](https://etherscan.io/address/${contract_address}) | **Sender:** [View on etherscan](https://etherscan.io/address/${sender})\n\n**Price:** ${price} ETH | **Quantity:** ${amount} | **Max Gas:** ${max_gas} | **Priority Fee:** ${priority_fee}`,
                    "color": color
                }
            ]
        }

        await axios.post(webhook, JSON.stringify(message), {
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch {

    }
}

async function mintErrorMessage(contract_address, sender, price, amount, max_gas, priority_fee, status, error, webhook) {

    try {
        const message = {
            "embeds": [
                {
                    "title": "MintAIO",
                    "description": `**Status:** ${status} | **Mode:** Automatic\n**Project**: [View on etherscan](https://etherscan.io/address/${contract_address}) | **Sender:** [View on etherscan](https://etherscan.io/address/${sender})\n\n**Price:** ${price} ETH | **Quantity:** ${amount} | **Max Gas:** ${max_gas} | **Priority Fee:** ${priority_fee}\n\n**Error:** ${error}`,
                    "color": 13963794
                }
            ]
        }

        await axios.post(webhook, JSON.stringify(message), {
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch {

    }
}

async function webhookSet(webhook) {

    try {
        const message = {
            "embeds": [
                {
                    "title": "MintAIO",
                    "description": "Discord Webhook has been updated!\n\n**Twitter:** [MintAIO](https://twitter.com/MintAIO_)\n\n**Disclaimer:** Please re-create your tasks to use the updated\nwebhook.",
                    "color": 767109
                }
            ]
        }

        await axios.post(webhook, JSON.stringify(message), {
            headers: {
                'Content-Type': 'application/json'
            }
        })
    } catch {

    }
}

async function getCollection(slug, network) {

    const api_key = (await axios.get(`https://mintaio-auth.herokuapp.com/os/keys/${machine_id}`)).data;

    const url = `https://${network}api.opensea.io/api/v1/collection/${slug}`

    console.log("API Keys:", api_key);

    try {
        const results = await axios.get(url, {
            headers: {
                "Accept": "application/json",
                "X-API-KEY": is_dev ? '2f6f419a083c46de9d83ce3dbe7db601' : api_key[Math.floor(Math.random() * api_key.length)]
            }
        });

        const data = results.data;

        const item_count = data.collection.stats.total_supply;
        const owners = data.collection.stats.num_owners;
        const floor_price = data.collection.stats.floor_price;
        const volume = data.collection.stats.total_volume;

        const name = data.collection.name;
        const image_url = data.collection.image_url;
        const seller_fee = data.collection.opensea_seller_fee_basis_points;

        return {
            item_count,
            owners,
            floor_price,
            volume,
            name,
            image_url,
            seller_fee
        }
    } catch(e) {

        log.info('getCollection error', e.message);

        return {
            message: e.message
        }
    }

}

module.exports = {
    web3,
    web3_logger,
    validToken,
    modules,
    machine_id,
    http_endpoint,
    os_http_endpoint,
    sendWebhookMessage,
    mintSuccessMessage,
    waitingMessage,
    mintErrorMessage,
    webhookSet,
    getCollection
}