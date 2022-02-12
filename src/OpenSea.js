import {useState, useEffect, useRef, useContext} from 'react';
import {Modal, Toast, Dropdown} from "bootstrap";
import './style.scss';
import {WalletContext} from "./state/WalletContext";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function OpenSea() {

    const modalRef = useRef();
    const walletDropdownRef = useRef();
    const proxiesDropdownRef = useRef();

    const [wallet, setWallet] = useContext(WalletContext);

    const [modal, setModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);
    const [proxiesDropdown, setProxiesDropdown] = useState([]);

    const [walletPassword, setWalletPassword] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [slug, setSlug] = useState("");
    const [checkSlug, setCheckSlug] = useState("");
    const [checkProject, setCheckProject] = useState(null);
    const [delay, setDelay] = useState("");
    const [price, setPrice] = useState("");
    const [maxGas, setMaxGas] = useState("");
    const [priority, setPriority] = useState("");
    const [proxies, setProxies] = useState([]);
    const [selectedProxy, setSelectedProxy] = useState("")

    const [monitors, setMonitors] = useState([]);

    useEffect(() => {

        const _modal = new Modal(modalRef.current, {keyboard: false});
        setModal(_modal);

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

        const proxiesDropdown = new Dropdown(proxiesDropdownRef.current, {});
        setProxiesDropdown(proxiesDropdown);

        const output = ipcRenderer.sendSync('load-os-monitors');

        setMonitors(output);

        console.log(output);

        const monitor_status_updater = (event, data) => {
            const output = ipcRenderer.sendSync('load-os-monitors');
            setMonitors(output);
        }

        ipcRenderer.on('monitor-status-update', monitor_status_updater)

        return () => {
            ipcRenderer.removeListener('monitor-status-update', monitor_status_updater);
        }

    }, [])

    const handleCheck = () => {
        if(checkSlug.length === 0) return;

        const output = ipcRenderer.sendSync('monitor-check-project', checkSlug);

        if(output.error === 1) {
            console.log("Could not find project");
            return;
        }

        setCheckProject(output);
    }

    const handleAdd = () => {

        if(slug.length === 0 || delay.length === 0 || price.length === 0 || maxGas.length === 0 || priority.length === 0 || walletPassword.length === 0 || selectedWallet === null) {
            console.log("Must fill out all of the input fields.");
            return;
        }

        const obj = {
            slug: slug,
            delay,
            price,
            maxGas,
            priority,
            walletId: selectedWallet.id,
            walletPassword
        }

        const output = ipcRenderer.sendSync('add-os-monitor', obj);

        console.log("Add:", obj);

        setMonitors(output.monitors);

    }

    const getWalletName = (publicKey) => {
        let output = '';

        for(const w of wallet) {
            if(`${publicKey}`.toLowerCase() === `0x${w.encrypted.address}`.toLowerCase()) {
                output = (w.name.length > 0 ? w.name : publicKey);
            }
        }

        return output;
    }

    const handleStart = (id) => {
        ipcRenderer.sendSync("start-os-monitor", id);
    }

    const handleStop = (id) => {
        ipcRenderer.sendSync("stop-os-monitor", id);
    }

    const handleDelete = (id) => {
        const output = ipcRenderer.sendSync("delete-os-monitor", id);
        setMonitors(output.monitors);
    }

    function kFormatter(num) {
        return Math.abs(num) > 999 ? Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num)
    }

    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex justify-content-between">

                <div>
                    <div className="new-task m-1 me-4" onClick={() => {modal.show()}}>
                        <span><i className="fas fa-plus-circle"></i></span>
                        <span className="ms-2">New Monitor</span>
                    </div>
                </div>

            </div>

            <div className="tasks-list mt-3">
                {
                    (typeof monitors !== 'undefined' && monitors.length > 0) ?
                        <div className="row d-flex p-3">
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Wallet</span></div>
                            <div className="col-4 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Project</span></div>
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Price</span></div>
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Status</span></div>
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Actions</span></div>
                        </div>
                        :
                        ''
                }

                {
                    (typeof monitors !== 'undefined' && monitors.length > 0) ?

                        monitors.map((m) => (
                            <div key={Math.random()} className="row d-flex p-3">

                                <div className="col-2" style={{textAlign: 'center'}}>
                                    {
                                        !m.locked ? <span style={{color: '#45d39d'}}><i className="fas fa-unlock me-2"></i></span> :
                                            <span style={{color: '#8a78e9'}} ><i className="fas fa-lock me-2"></i></span>
                                    }
                                    <span style={{color: 'white'}}>{getWalletName(m.public_key)}</span>
                                </div>
                                <div className="col-4" style={{textAlign: 'center'}}>
                                    <span style={{color: 'white'}}>{m.slug}</span>
                                </div>
                                <div className="col-2" style={{textAlign: 'center'}}>
                                    <span style={{color: 'white'}}>{m.desired_price} <span style={{color: "#8a78e9"}}>Ξ</span></span>
                                </div>
                                <div className="col-2" style={{textAlign: 'center'}}>
                                    <span style={{color: 'white'}}>{m.status.result.message}</span>
                                </div>
                                <div className="col-2" style={{color: 'white', textAlign: 'center'}}>
                                    <span className="ms-1 me-1 start-btn" onClick={() => handleStart(m.id)}><i className="fas fa-play-circle"></i></span>
                                    <span className="ms-1 me-1 stop-btn" onClick={() => handleStop(m.id)}><i className="fas fa-stop-circle"></i></span>
                                    <span className="ms-1 me-1 delete-btn" onClick={() => handleDelete(m.id)}><i className="fas fa-trash-alt"></i></span>
                                </div>
                            </div>
                        ))

                        :
                        ''
                }
            </div>

            <div className="modal" ref={modalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">New Monitor</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">

                            <div className={"d-flex align-items-center mb-3"}>
                                <div className={"w-75"}>
                                    <label htmlFor="slug-address" className="form-label" style={{color: "white"}}>Check Slug</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control" id="slug-address" placeholder="Project Slug" onChange={(e) => {setCheckSlug(e.target.value)}} value={checkSlug} />
                                    </div>
                                </div>

                                <div className={"ms-2 mt-auto w-25"}>
                                    <button type="text" className="form-control btn-add" onClick={handleCheck}>Check</button>
                                </div>
                            </div>

                            {
                                checkProject === null ?
                                    ''
                                    :
                                    <div className={"os-check mb-2"}>

                                        <div className={"os-header mt-3"}>
                                            <img src={checkProject.image_url} />
                                            <div>
                                                {checkProject.name}
                                            </div>
                                        </div>

                                        <div className={"d-flex justify-content-between p-2"}>
                                            <div className={"d-flex flex-column justify-content-center"}>
                                                <span>{kFormatter(checkProject.item_count)}</span>
                                                <span>items</span>
                                            </div>
                                            <div className={"d-flex flex-column justify-content-center"}>
                                                <span>{kFormatter(checkProject.owners)}</span>
                                                <span>owners</span>
                                            </div>
                                            <div className={"d-flex flex-column justify-content-center"}>
                                                <span><i className="fab fa-ethereum me-2" style={{color: '#8a78e9'}}></i>{checkProject.floor_price}</span>
                                                <span>floor price</span>
                                            </div>
                                            <div className={"d-flex flex-column justify-content-center"}>
                                                <span><i className="fab fa-ethereum me-2" style={{color: '#8a78e9'}}></i>{kFormatter(Number.parseFloat(checkProject.volume).toFixed(2))}</span>
                                                <span>volume traded</span>
                                            </div>
                                        </div>
                                    </div>

                            }


                            <div className={"row"}>
                                <div className={"col-8"}>
                                    <label htmlFor="slug-address" className="form-label" style={{color: "white"}}>Project Slug</label>
                                    <div className="input-group mb-3">
                                        <input type="text" className="form-control" id="slug-address" placeholder="Project Slug" onChange={(e) => {setSlug(e.target.value)}} value={slug} />
                                    </div>
                                </div>
                                <div className={"col-4"}>
                                    <label htmlFor="delay" className="form-label" style={{color: "white"}}>Delay</label>
                                    <div className="input-group mb-3">
                                        <input type="number" min={"1500"} className="form-control" id="delay" placeholder="Delay (milliseconds)" onChange={(e) => {setDelay(e.target.value)}} value={delay} />
                                    </div>
                                </div>
                            </div>


                            <div className={"row"}>
                                <div className={"col-4"}>
                                    <label htmlFor="desired-price" className="form-label" style={{color: "white"}}>Desired Price</label>
                                    <div className="input-group mb-3">
                                        <input type="text" className="form-control" id="desired-price" placeholder="Desired Price" onChange={(e) => {setPrice(e.target.value)}} value={price} />
                                    </div>
                                </div>

                                <div className={"col-4"}>
                                    <label htmlFor="max-gas" className="form-label" style={{color: "white"}}>Maximum Gas</label>
                                    <div className="input-group mb-3">
                                        <input type="text" className="form-control" id="max-gas" placeholder="Maximum Gas (GWEI)" onChange={(e) => {setMaxGas(e.target.value)}} value={maxGas} />
                                    </div>
                                </div>

                                <div className={"col-4"}>
                                    <label htmlFor="priority-fee" className="form-label" style={{color: "white"}}>Priority Fee</label>
                                    <div className="input-group mb-3">
                                        <input type="text" className="form-control" id="priority-fee" placeholder="Priority Fee (GWEI)" onChange={(e) => {setPriority(e.target.value)}} value={priority} />
                                    </div>
                                </div>

                            </div>

                            <div className="d-flex mb-2">
                                <div className="dropdown w-25">
                                    <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                            id="wallets-dropdown" data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            ref={proxiesDropdownRef}
                                            onClick={() => {proxiesDropdown.toggle()}}>
                                        {selectedProxy.length === 0 ? "Select a proxy" : selectedProxy}
                                    </button>
                                    <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                        {
                                            proxies.map((p) => (
                                                <li key={Math.random()}><a className="dropdown-item" onClick={() => {setSelectedProxy(p)} }>{p}</a></li>
                                            ))
                                        }
                                    </ul>
                                </div>
                            </div>

                            <div className="d-flex">
                                <div className="dropdown w-25">
                                    <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                            id="wallets-dropdown" data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            ref={walletDropdownRef}
                                            onClick={() => {walletDropdown.toggle()}}>
                                        {selectedWallet === null ? "Select a wallet" : selectedWallet.name}
                                    </button>
                                    <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                        {
                                            wallet.map((w) => (
                                                <li key={w.id}><a className="dropdown-item" onClick={() => {setSelectedWallet(w)} }>{w.name.length > 0 ? w.name + " | " : ""}0x{w.encrypted.address}</a></li>
                                            ))
                                        }
                                    </ul>
                                </div>
                                <input type="password" className="form-control w-75 ms-2" onChange={(e) => {setWalletPassword(e.target.value)}} placeholder="Password" value={walletPassword}/>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={handleAdd}>Add Monitor</button>
                        </div>
                    </div>
                </div>
            </div>



        </div>
    )
}

export default OpenSea;