import {useEffect, useState, useRef} from "react";

import {Link} from 'react-router-dom';

import {Modal} from "bootstrap";
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Header() {

    const [gas, setGas] = useState({gas: '0', gasLimit: ''});
    const [authModal, setAuthModal] = useState([]);
    const [api, setApi] = useState("");
    const [current, setCurrent] = useState("tasks");

    const authRef = useRef();

    const handleGas = () => {
        const output = ipcRenderer.sendSync('gas-price');

        setGas(output);
    }

    const handleAuth = () => {

        if(api.length === 0) return;

        localStorage.setItem("api_key", api);

        const output = ipcRenderer.sendSync('auth-user', api);

        if(output) {
            authModal.hide();
        }

    }

    useEffect(() => {

        if(localStorage.getItem("api_key") !== null) {
            setApi(localStorage.getItem("api_key"));
        }

        const auth_modal = new Modal(authRef.current, {keyboard: false});
        setAuthModal(auth_modal);

        const output = ipcRenderer.sendSync('is-auth');

        if(!output.isAuth) {
            auth_modal.show();
        }

        handleGas();

        const interval = setInterval(() => {
            handleGas();
        }, 15 * 1000);

        return () => {
            clearInterval(interval);
        }

    }, []);

    return(
        <div className="header-wrapper d-flex justify-content-between">
            <div className="header d-flex px-2 py-3">
                <div className={current === "wallet" ? "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 selected-header" : "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 default-header"}>
                    <span><Link to="/wallet" onClick={() => setCurrent("wallet")}><i className="fas fa-wallet me-2"></i>Wallets</Link></span>
                </div>
                <div className={current === "tasks" ? "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 selected-header" : "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 default-header"}>
                    <span className="ms-2"><Link to="/" onClick={() => setCurrent("tasks")}><i className="fas fa-list-ul me-2"></i>Tasks</Link></span>
                </div>
                <div className={current === "mint-watch" ? "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 selected-header" : "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 default-header"}>
                    <span className="ms-2"><Link to="/mint" onClick={() => setCurrent("mint-watch")}><i className="far fa-eye me-2"></i>Mint Watch</Link></span>
                </div>
                <div className={current === "settings" ? "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 selected-header" : "header-btn rounded-3 pt-2 pb-2 ps-2 pe-2 m-1 default-header"}>
                    <span className="ms-2"><Link to="/settings" onClick={() => setCurrent("settings")}><i className="fas fa-cog me-2"></i>Settings</Link></span>
                </div>
            </div>

            <div className="d-flex align-items-center p-3">
                <span style={{color: 'white'}}><i className="fas fa-gas-pump me-2" style={{color: '#8a78e9'}}></i>{Number.parseFloat(gas.gas).toFixed(0)} Gwei</span>
            </div>


            <div className="modal" ref={authRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Authorize</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <input type="text" className="form-control w-100 m-1" onChange={(e) => setApi(e.target.value)} value={api} placeholder="API Key"/>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={handleAuth}>Authorize</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Header;