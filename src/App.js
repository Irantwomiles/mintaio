import { useContext, useEffect, useState } from "react";
import { WalletContext } from "./state/WalletContext";
import {HashRouter as Router, Route, Switch} from 'react-router-dom';

import Header from './Header';
import Wallet from './Wallet';
import Tasks from "./Tasks";

import React from "react";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function App() {

    const [wallet, setWallet] = useContext(WalletContext);

    console.log(wallet);

    useEffect(() => {

        const loadWallets = () => {
            const wallets = ipcRenderer.sendSync("load-wallets");
            setWallet(wallets);
        }

        loadWallets();

    }, []);

    return (
        <Router>
            <Header/>
            <Switch>
                <Route path="/wallet">
                    <Wallet/>
                </Route>
                <Route path="/">
                    <Tasks/>
                </Route>
            </Switch>
        </Router>
    )
}

export default App;