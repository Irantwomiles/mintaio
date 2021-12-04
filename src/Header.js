import {useEffect, useState} from "react";

import {Link} from 'react-router-dom';
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Header() {

    const [gas, setGas] = useState({gas: '0', gasLimit: ''});

    useEffect(() => {

        const interval = setInterval(() => {

            const output = ipcRenderer.sendSync('gas-price');

            setGas(output);

        }, 15 * 1000);

        return () => {
            clearInterval(interval);
        }

    }, [])

    return(
        <div className="header-wrapper d-flex justify-content-between">
            <div className="header d-flex px-2 py-3">
                <div className="header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1">
                    <span><Link to="/wallet"><i className="fas fa-wallet me-2"></i>Wallets</Link></span>
                </div>
                <div className="header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1">
                    <span className="ms-2"><Link to="/"><i className="fas fa-list-ul me-2"></i>Tasks</Link></span>
                </div>
            </div>

            <div className="d-flex align-items-center p-3">
                <span style={{color: 'white'}}><i className="fas fa-gas-pump me-2" style={{color: '#8a78e9'}}></i>{Number.parseFloat(gas.gas).toFixed(0)} Gwei</span>
            </div>
        </div>
    );
}

export default Header;