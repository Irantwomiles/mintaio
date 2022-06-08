import {useEffect, useState, useRef} from "react";

import {Link} from 'react-router-dom';

import {Modal} from "bootstrap";
import './style.scss';
import logo from './images/mint-aio-transparent.png';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Sidebar() {

    const [gas, setGas] = useState({gas: '0', gasLimit: ''});
    const [authModal, setAuthModal] = useState([]);
    const [api, setApi] = useState("");
    const [current, setCurrent] = useState("tasks");
    const [authStatus, setAuthStatus] = useState({auth: false, message: ''});

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

    const handleDiscordAuth = () => {
        ipcRenderer.send('auth-user-discord', api);
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

        const handle_discord_auth = (event, data) => {
            console.log("discord auth:", data);

            setAuthStatus(data);

            if(data.auth) {
                setTimeout(() => {
                    console.log(auth_modal);
                    auth_modal.hide();
                }, 2 * 1000);
            }
        }

        ipcRenderer.on('auth-user-discord', handle_discord_auth);

        return () => {
            clearInterval(interval);
            ipcRenderer.removeListener('auth-user-discord', handle_discord_auth);
        }

    }, []);

    return(
        <div className="sidebar-wrapper d-flex flex-column justify-content-between align-items-center h-100">

            <div>
                <div className={"sidebar-logo"}>
                    <img src={logo}/>
                </div>

                <div>
                    <div className={ current === "wallet" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2" }>
                        <Link to="/wallet" onClick={() => setCurrent("wallet")}>
                            <i className="fas fa-wallet fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "tasks" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/" onClick={() => setCurrent("tasks")}>
                            <i className="fas fa-list-ul fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "mint-watch" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/mint" onClick={() => setCurrent("mint-watch")}>
                            <i className="far fa-eye fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "opensea" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/opensea" onClick={() => setCurrent("opensea")}>
                            <i className="fa-solid fa-crosshairs fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "opensea-bid" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/opensea-bid" onClick={() => setCurrent("opensea-bid")}>
                            <i className="fa-solid fa-sailboat fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "proxy" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/proxy" onClick={() => setCurrent("proxy")}>
                            <i className="fa-solid fa-wifi fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                    <div className={current === "settings" ? "sidebar-selected mt-2" : "sidebar-unselected mt-2"}>
                        <Link to="/settings" onClick={() => setCurrent("settings")}>
                            <i className="fas fa-cog fa-2x p-3 rounded"></i>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="d-flex align-items-center p-3">
                {/*<span style={{color: 'white'}}><i className="fas fa-gas-pump me-2" style={{color: '#8a78e9'}}></i>{Number.parseFloat(gas.gas).toFixed(0)} Gwei</span>*/}
                <span style={{color: "#323857"}}>v2.0.5</span>
            </div>

            <div className="modal" ref={authRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Authorize</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className={"d-flex"}>
                                <input type="text" className="form-control w-100 me-2" onChange={(e) => setApi(e.target.value)} value={api} placeholder="API Key"/>
                                <button type="button" className="btn btn-add" onClick={handleAuth}>Authorize</button>
                            </div>
                            <div className={"my-3"} style={{color: "white"}}>or</div>
                            <div>
                                <button className={"btn btn-discord"} onClick={handleDiscordAuth}>Login with Discord</button>
                            </div>

                                <div className={`my-3 ${authStatus.auth ? 'success-auth' : 'failed-auth'}`} style={{fontWeight: "3rem"}}>{authStatus.message}</div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Sidebar;