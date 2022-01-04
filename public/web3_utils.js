const axios = require('axios');
const is_dev = require('electron-is-dev');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const fs = require('fs');

const dataPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share");

const output = fs.readFileSync(`${dataPath}\\mintaio\\api_keys.json`);
const json_value = JSON.parse(output);

const primary_key = json_value.primary_key;
const secondary_key = json_value.secondary_key;

const websocket_key         = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/${primary_key}`;
const websocket_key_logger  = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/${secondary_key}`;

const erc721_abi = require('./ERC721-ABI.json');

const web3 = createAlchemyWeb3(websocket_key);
const web3_logger = createAlchemyWeb3(websocket_key_logger);

const requireFromWeb = require('require-from-web');

const url = 'http://localhost:1458/api/files/test.js';

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

module.exports = {
    web3,
    web3_logger,
    validToken,
    modules
}