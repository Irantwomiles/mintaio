import React, {useState} from 'react';

export const WalletContext = React.createContext();

export const WalletProvider = ({children}) => {
    const [wallets, setWallets] = useState([]);

    return(
        <WalletContext.Provider value={[wallets, setWallets]}>
            {children}
        </WalletContext.Provider>
    )
}