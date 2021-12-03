import { useContext, useEffect, useState } from "react";

import { WalletContext } from "./state/WalletContext";
import { TaskContext } from "./state/TaskContext";

import {HashRouter as Router, Route, Switch} from 'react-router-dom';

import Header from './Header';
import Wallet from './Wallet';
import Tasks from "./Tasks";

import React from "react";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function App() {

    const [wallet, setWallet] = useContext(WalletContext);
    const [tasks, setTasks] = useContext(TaskContext);

    useEffect(() => {

        const loadWallets = () => {
            const wallets = ipcRenderer.sendSync("load-wallets");
            setWallet(wallets);
        }

        loadWallets();

        const loadTasks = () => {
            const tasks = ipcRenderer.sendSync("load-tasks");
            setTasks(tasks);
        }

        loadTasks();

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