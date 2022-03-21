const { ipcMain, app } = require('electron');
const {
    get_web3_logger,
    machine_id,
    webhookSet,
    getCollection,
    validToken
} = require('./web3_utils.js');
const log = require('electron-log');
const {tasks} = require('./ipcmain_events');
const {getWindow} = require('./window_utils');
const erc721_abi = require("./ERC721-ABI.json");

let mint_watch = null;
let mint_logs = [];

let status_watch = null;

ipcMain.on('start-mint-watch', (event, data) => {

    if(mint_watch !== null) {
        return event.returnValue = {
            error: 1
        }
    }

    mint_watch = get_web3_logger().eth.subscribe('logs', async function(err, result) {
        if(!err) {
            const transaction_receipt = await get_web3_logger().eth.getTransactionReceipt(result.transactionHash);

            if(transaction_receipt === null) return;

            if(!transaction_receipt.hasOwnProperty('logs')) return;

            if(transaction_receipt.logs && transaction_receipt.logs.length >= 1) {
                const logs = transaction_receipt.logs[0];

                if(!validToken(transaction_receipt.logs)) return;

                if(logs.topics.length === 4) {
                    const topic1 = logs.topics[0]; // event
                    const topic2 = logs.topics[1]; // from address (0x00..000)
                    const topic3 = logs.topics[2]; // to address
                    const topic4 = logs.topics[3]; // amount

                    // if the value is undefined or the tokenId > 12000 skip
                    if(typeof topic4 === 'undefined' || topic4 > 12000) return;

                    const transaction = await get_web3_logger().eth.getTransaction(result.transactionHash);
                    // console.log(result.transactionHash, transaction.to);
                    const contract_address = transaction.to;

                    const contract = new (get_web3_logger()).eth.Contract(erc721_abi, contract_address);

                    let obj = {
                        contract_address: contract_address,
                        name: 'N/A',
                        value: transaction_receipt.logs.length > 0 ? Number.parseFloat(get_web3_logger().utils.fromWei(transaction.value, 'ether')) / transaction_receipt.logs.length : get_web3_logger().utils.fromWei(transaction.value, 'ether')
                    }

                    if(contract !== null) {
                        try{
                            const name = await contract.methods.name().call();
                            obj.name = name;
                        } catch(e) {
                        }
                    }

                    if(mint_logs.length >= 100) {
                        mint_logs.shift();
                    }

                    mint_logs.push(obj);

                    getWindow().webContents.send('mint-watch', mint_logs);

                }

            }

        }
    })

    return event.returnValue = {
        error: 0
    }
})

ipcMain.on('stop-mint-watch', async (event, data) => {

    if(mint_watch === null) {
        return event.returnValue = {
            error: 1
        }
    }

    await mint_watch.unsubscribe();

    mint_watch = null;

    return event.returnValue = {
        error: 0
    }
})

ipcMain.on('mint-logs', (event, data) => {
    return event.returnValue = {
        logs: mint_logs
    }
})

ipcMain.on('start-mint-status', (event, data) => {
    return event.returnValue = start_status_watch();
})

const start_status_watch = () => {

    if(status_watch !== null) {

        log.info('status_watch is not null');
        return {
            error: 1
        }
    }

    status_watch = get_web3_logger().eth.subscribe('alchemy_fullPendingTransactions', async function(err, result) {
        if(err) return;

        const from_address = result.from;
        const contract_address = result.to;

        for(const task of tasks) {

            if(task.start_mode !== 'FIRST_BLOCK') continue;

            if(task.contract_creator.toLowerCase() === from_address.toLowerCase() && task.contract_address.toLowerCase() === contract_address.toLowerCase()) {
                log.info(`Found Tx in mempool for ${contract_address} sent by ${from_address}`);

                task.start();
            }

        }

    })

    log.info('status_watch has been started.');

    return {
        error: 0
    }
}

module.exports = {
    start_status_watch
}
