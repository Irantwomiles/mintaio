const axios = require('axios');
const is_dev = require('electron-is-dev');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const fs = require('fs');

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
const http_endpoint = `https://eth-${is_dev ? 'rinkeby' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;

const erc721_abi = require('./ERC721-ABI.json');

const web3 = createAlchemyWeb3(http_endpoint);
const web3_logger = createAlchemyWeb3(websocket_key_logger);

const requireFromWeb = require('require-from-web');
const id = require('node-machine-id');

const machine_id = id.machineIdSync();

const url = `https://mintaio-auth.herokuapp.com/api/files/${machine_id}/modules.js`;

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

module.exports = {
    web3,
    web3_logger,
    validToken,
    modules,
    machine_id,
    http_endpoint,
    sendWebhookMessage
}