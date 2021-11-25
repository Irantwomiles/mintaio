const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

const websocket_key = "wss://eth-mainnet.alchemyapi.io/v2/dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4";

const web3 = createAlchemyWeb3(websocket_key);

module.exports = {
    web3
}