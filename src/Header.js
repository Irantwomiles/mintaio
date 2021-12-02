import {useEffect, useState} from "react";

import {Link} from 'react-router-dom';
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Header() {

    const [gas, setGas] = useState({gas: '', gasLimit: ''});

    useEffect(() => {

        const interval = setInterval(() => {

            const output = ipcRenderer.sendSync('gas-price');

            setGas(output);

        }, 10 * 1000);

        return () => {
            clearInterval(interval);
        }

    }, [])

    return(
        <div className="header-wrapper">
            <div className="header d-flex p-3">
                <div className="header-btn border rounded-3 pt-2 pb-2 ps-3 pe-3 m-1">
                    <span className="ms-2"><Link to="/wallet"><i className="fas fa-wallet"></i> Wallets</Link></span>
                </div>
                <div className="header-btn border rounded-3 pt-2 pb-2 ps-3 pe-3 m-1">
                    <span className="ms-2"><Link to="/"><i className="fas fa-list-ul"></i> Tasks</Link></span>
                </div>
            </div>

            <div>
                <span style={{color: 'white'}}>Gas {gas.gas} Gas limit {gas.gasLimit}</span>
            </div>
        </div>
    );
}

export default Header;