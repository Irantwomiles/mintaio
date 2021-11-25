import React from 'react';
import ReactDOM from 'react-dom';
import Header from './Header';
import Wallet from './Wallet';
import {WalletProvider} from "./state/WalletContext";
import reportWebVitals from './reportWebVitals';

import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@popperjs/core';

ReactDOM.render(
    <React.StrictMode>
        <WalletProvider>
            <Header/>
            <Wallet/>
        </WalletProvider>
    </React.StrictMode>,
    document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
