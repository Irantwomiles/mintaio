const axios = require('axios');
const is_dev = require('electron-is-dev');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

const websocket_key         = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4`;
const websocket_key_logger  = `wss://eth-${is_dev ? 'ropsten' : 'mainnet'}.alchemyapi.io/v2/22SFODSbXp_n6Zedhj_4w1o5M4FmS-C_`;
const etherscan_api = "1RCRV15RRHI5VYSJ44N4K17MG4TX1TCTV9";

const erc721_abi = require('./ERC721-ABI.json');

const web3 = createAlchemyWeb3(websocket_key);
const web3_logger = createAlchemyWeb3(websocket_key_logger);

async function getBalance(wallet) {
    const output = await web3.eth.getBalance(wallet);
    const eth = web3.utils.fromWei(output, 'ether');

    return eth;
}

async function getContractABI(contract_address) {
    const response = await axios.get(`https://api${is_dev ? '-ropsten' : ''}.etherscan.io/api?module=contract&action=getabi&address=${contract_address}&apikey=${etherscan_api}`);
    return response.data.result;
}

async function getMintMethod(contract_address) {


    const abi = await getContractABI(contract_address);

    if(abi === 'Contract source code not verified' || abi === 'Invalid Address format') {
        return null;
    }

    const contract = new web3.eth.Contract(JSON.parse(abi), contract_address);

    const jsonInterface = contract._jsonInterface;

    let output = [];

    for(const j of jsonInterface) {
        if(j.stateMutability === 'payable') {
            output.push(j);
        }
    }

    return output;
}

async function sendTransaction(contract_address, private_key, mint_method, price, gas, gasLimit, gasPriorityFee, nonce, args) {
    const account = web3.eth.accounts.privateKeyToAccount(private_key);

    const abi = await getContractABI(contract_address);
    const contract = new web3.eth.Contract(JSON.parse(abi), contract_address);

    const data = contract.methods[mint_method](...args).encodeABI();

    const tx = {
        from: account.address,
        to: contract_address,
        value: price,
        nonce: nonce,
        maxFeePerGas: gas,
        gasLimit: gasLimit,
        maxPriorityFeePerGas: gasPriorityFee,
        data: data
    }

    console.log(tx);

    const sign = await web3.eth.accounts.signTransaction(tx, account.privateKey);

    return web3.eth.sendSignedTransaction(sign.rawTransaction); // returning the promise
}

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
    web3, web3_logger, getMintMethod, getContractABI, sendTransaction, getBalance, validToken
}