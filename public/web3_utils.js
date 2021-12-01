const axios = require('axios');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");

// const websocket_key = "wss://eth-mainnet.alchemyapi.io/v2/dv8VF3LbDTYOXbTIhiSFl89CBQ_wvxE4";
const websocket_key = "wss://eth-ropsten.alchemyapi.io/v2/TXfnSpyeUAtYXqHerL1im8uOj-Yckrw5";
const etherscan_api = "1RCRV15RRHI5VYSJ44N4K17MG4TX1TCTV9";

const web3 = createAlchemyWeb3(websocket_key);

async function getBalance(wallet) {
    const output = await web3.eth.getBalance(wallet);
    const eth = web3.utils.fromWei(output, 'ether');

    return eth;
}

async function getContractABI(contract_address) {
    const response = await axios.get(`https://api-ropsten.etherscan.io/api?module=contract&action=getabi&address=${contract_address}&apikey=${etherscan_api}`);
    return response.data.result;
}

async function getMintMethod(contract_address) {


    const abi = await getContractABI(contract_address);

    if(abi === 'Contract source code not verified' || abi === 'Invalid Address format') {
        return null;
    }

    const contract = new web3.eth.Contract(JSON.parse(abi), contract_address);

    const jsonInterface = contract._jsonInterface;

    for(let i = 0; i < jsonInterface.length; i++) {
        const obj = jsonInterface[i];

        if(obj.stateMutability === 'payable') {
            return obj;
        }
    }

    return null;
}

async function sendTransaction(contract_address, private_key, price, gas, gasLimit, nonce, args) {
    const account = web3.eth.accounts.privateKeyToAccount(private_key);

    console.log(account);

    const abi = await getContractABI(contract_address);
    const mint_method = await getMintMethod(contract_address);
    const contract = new web3.eth.Contract(JSON.parse(abi), contract_address);

    const data = contract.methods[mint_method.name](...args).encodeABI();

    const tx = {
        from: account.address,
        to: contract_address,
        value: `${web3.utils.toWei(price)}`,
        nonce: nonce,
        gas: parseFloat(gas),
        gasLimit: parseFloat(gasLimit),
        data: data
    }

    const sign = await web3.eth.accounts.signTransaction(tx, account.privateKey);
    return web3.eth.sendSignedTransaction(sign.rawTransaction); // returning the promise
}

module.exports = {
    web3, getMintMethod, getContractABI, sendTransaction
}