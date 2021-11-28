const { sendTransaction } = require('../web3_utils');

class Task {

    /**
     *
     * @param contract_address | Contract address of the NFT
     * @param account | Account object of the wallet that is to be used to mint this NFT
     * @param price | Price in ETH (Should account for how many you are buying ex: 1 = 0.06 -> 4 = 0.24)
     */
    constructor(contract_address, account, price) {
        this.contract_address = contract_address;
        this.account = account;
        this.price = price;
    }

    start() {

    }

}