import {useState, useEffect, useRef, useContext} from 'react';
import {Modal, Toast, Dropdown} from "bootstrap";
import './style.scss';
import {WalletContext} from "./state/WalletContext";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function OpenSeaBid() {

    const modalRef = useRef();
    const walletDropdownRef = useRef();
    const traitsRef = useRef();
    const unlockModalRef = useRef();
    const toastRef = useRef();

    const [wallet, setWallet] = useContext(WalletContext);

    const [modal, setModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);
    const [traitsDropdown, setTraitsDropdown] = useState([]);
    const [unlockWalletId, setUnlockWalletId] = useState("");
    const [unlockPassword, setUnlockPassword] = useState("");
    const [unlockModal, setUnlockModal] = useState([]);
    const [toastValue, setToastValue] = useState({});
    const [toast, setToast] = useState([]);

    const [walletPassword, setWalletPassword] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [slug, setSlug] = useState("");
    const [checkSlug, setCheckSlug] = useState("");
    const [checkProject, setCheckProject] = useState(null);
    const [delay, setDelay] = useState("");
    const [price, setPrice] = useState("");
    const [maxGas, setMaxGas] = useState("");
    const [priority, setPriority] = useState("");
    const [selectedTrait, setSelectedTrait] = useState(null);
    const [network, setNetwork] = useState("mainnet");

    const [monitors, setMonitors] = useState([]);

    useEffect(() => {

        const _modal = new Modal(modalRef.current, {keyboard: false});
        setModal(_modal);

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

        const traitsDropdown = new Dropdown(traitsRef.current, {});
        setTraitsDropdown(traitsDropdown);

        const unlockModal = new Modal(unlockModalRef.current, {keyboard: false});
        setUnlockModal(unlockModal);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

        const output = ipcRenderer.sendSync('load-os-monitors');

        setMonitors(output);

        console.log(output);

        const monitor_status_updater = (event, data) => {
            const output = ipcRenderer.sendSync('load-os-monitors');
            setMonitors(output);
        }

        ipcRenderer.on('project-status-update', monitor_status_updater)

        return () => {
            ipcRenderer.removeListener('project-status-update', monitor_status_updater);
        }

    }, [])

    const handleUnlockWallet = (m) => {
        console.log("m:", m);
        setUnlockWalletId(m.wallet_id);
        unlockModal.show();
    }

    const unlockWallet = () => {

        unlockModal.hide();

        const output = ipcRenderer.sendSync('os-unlock-wallet', {walletId: unlockWalletId, password: unlockPassword});

        setUnlockPassword("");

        if(output.error === 1) {
            setToastValue({
                message: "Could not find this wallet.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "Incorrect wallet password.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setMonitors(output.monitors);

        setToastValue({
            message: "Wallet unlocked.",
            color: "#73d9b0"
        });

        toast.show();
    }

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
            network,
            trait: selectedTrait,
            walletId: selectedWallet.id,
            walletPassword
        }

        const output = ipcRenderer.sendSync('add-os-monitor', obj);

        modal.hide();

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

    const getWalletNameById = (id) => {
        let output = '';

        for(const w of wallet) {
            if(id === w.id) {
                output = (w.name.length > 0 ? w.name : w.encrypted.address);
            }
        }

        return output;
    }

    /*
    Starts/Creates projects
     */
    const handleStart = (data) => {
        ipcRenderer.sendSync("start-fetching-project", data);
    }

    const handleStop = (id) => {
        ipcRenderer.sendSync("stop-os-monitor", id);
    }

    const handleDelete = (id) => {
        const output = ipcRenderer.sendSync("delete-os-monitor", id);

        console.log("delete", output);

        setMonitors(output.monitors);
    }

    function kFormatter(num) {
        return Math.abs(num) > 999 ? Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' : Math.sign(num)*Math.abs(num)
    }

    function getStatus(status) {
        switch(status.error) {
            case -1:
                return 'Inactive';
            case 0:
                return 'Found Order'
            case 1:
                return 'Sniped Successfully'
            case 2:
                return status.result.message
            case 3:
                return 'Searching...'
            case 4:
                return 'Unlock Wallet'
            case 5:
                return 'Started'
        }
    }

    function getStatusClass(status) {
        switch(status.error) {
            case -1:
                return 'task-inactive';
            case 0:
                return 'task-pending'
            case 1:
                return 'task-success'
            case 2:
                return 'task-error'
            case 3:
                return 'task-pending'
            case 4:
                return 'task-error'
            case 5:
                return 'task-warning'
        }
    }

    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex justify-content-between">

                <div>
                    <div className="new-task m-1 me-4" onClick={() => {modal.show()}}>
                        <span><i className="fas fa-plus-circle"></i></span>
                        <span className="ms-2">New Bid</span>
                    </div>
                </div>

            </div>

            <div className="tasks-list mt-3">

                <div className={"d-flex"}>
                    <div>
                        <label htmlFor="slug-address" className="form-label" style={{color: "white"}}>Project Slug</label>
                        <div className="input-group">
                            <input type="text" className="form-control" id="slug-address" placeholder="Project Slug" onChange={(e) => {setSlug(e.target.value)}} value={slug} />
                        </div>
                    </div>
                    <div>
                        <button onClick={() => {handleStart({slug: slug})}}>Start</button>
                    </div>
                </div>


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

                            <div className={`d-flex mb-2 ${(checkProject !== null && Object.keys(checkProject.traits).length > 0) ? '' : 'd-none'}`}>
                                <div className="dropdown w-25">
                                    <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                            id="wallets-dropdown" data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            ref={traitsRef}
                                            onClick={() => {traitsDropdown.toggle()}}>
                                        {selectedTrait === null ? "Trait" : `${selectedTrait.trait_type} ${(selectedTrait.value)}`}
                                    </button>
                                    <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                        {
                                            (checkProject !== null && checkProject.traits.length > 0) ? checkProject.traits.map((t) => (
                                                <li key={Math.random()}><a className="dropdown-item" onClick={() => {setSelectedTrait(t)} }>{t.trait_type} ({t.value}) {t.percentile}%</a></li>
                                            )) : ''
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

                            <div className="d-flex mt-3">
                                <div className="form-check me-3">
                                    <input className="form-check-input" type="radio" name="flexRadioDefault"
                                           id="mainnet" onChange={() => {setNetwork('mainnet')}} checked={network === 'mainnet'} />
                                    <label className="form-check-label" htmlFor="mainnet" style={{color: "white"}}>
                                        Mainnet
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input className="form-check-input" type="radio" name="flexRadioDefault"
                                           id="flashbots" onChange={() => {setNetwork('flashbots')}} checked={network === 'flashbots'} />
                                    <label className="form-check-label" htmlFor="flashbots" style={{color: "white"}}>
                                        Flashbots
                                    </label>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={handleAdd}>Add Monitor</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal" ref={unlockModalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Unlock Wallet</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex justify-content-center">
                                <span className="mb-1" style={{color: 'white'}}>{getWalletNameById(unlockWalletId)}</span>
                            </div>
                            <input type="password" className="form-control m-1" onChange={(e) => {setUnlockPassword(e.target.value)}} placeholder="Password" value={unlockPassword}/>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={(e) => unlockWallet() }>Unlock</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="toast position-fixed bottom-0 end-0 m-4" ref={toastRef} role="alert" aria-live="assertive" aria-atomic="true" style={{borderColor: `${toastValue.color}`}}>
                <div className="toast-header">
                    <strong className="me-auto" style={{color: toastValue.color}}>MintAIO</strong>
                    <div className="toast-close" data-bs-dismiss="toast"><i className="far fa-times-circle"></i></div>
                </div>
                <div className="toast-body">
                    {toastValue.message}
                </div>
            </div>

        </div>
    )
}

export default OpenSeaBid;