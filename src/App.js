import { useContext, useEffect } from "react";

import { WalletContext } from "./state/WalletContext";
import { TaskContext } from "./state/TaskContext";

import {HashRouter as Router, Route, Switch} from 'react-router-dom';

import Sidebar from './Sidebar';
import Wallet from './Wallet';
import Tasks from "./Tasks";
import MintWatch from "./MintWatch";
import Settings from "./Settings";

import React from "react";
import OpenSea from "./OpenSea";
import OpenSeaBid from "./OpenSeaBid";
import Proxy from "./Proxy";

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
            <div className={"d-flex h-100"}>
                <div className={"sidebar h-100"}>
                    <Sidebar/>
                </div>
                <div className={"content h-100"}>
                    <Switch>
                        <Route exact path="/">
                            <Tasks/>
                        </Route>
                        <Route exact path="/wallet">
                            <Wallet/>
                        </Route>
                        <Route exact path="/mint">
                            <MintWatch/>
                        </Route>
                        <Route exact path="/opensea-bid">
                            <OpenSeaBid/>
                        </Route>
                        <Route exact path="/opensea">
                            <OpenSea/>
                        </Route>
                        <Route exact path="/proxy">
                            <Proxy/>
                        </Route>
                        <Route exact path="/settings">
                            <Settings/>
                        </Route>
                    </Switch>
                </div>
            </div>
        </Router>
    )
}

export default App;