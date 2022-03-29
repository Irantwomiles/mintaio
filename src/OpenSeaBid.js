import {useState, useEffect, useRef, useContext} from 'react';
import {Modal, Toast, Dropdown} from "bootstrap";
import './style.scss';
import {WalletContext} from "./state/WalletContext";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function OpenSeaBid() {

    const walletDropdownRef = useRef();
    const projectsDropdownRef = useRef();
    const traitsDropdownRef = useRef();
    const unlockModalRef = useRef();
    const toastRef = useRef();

    const [wallet, setWallet] = useContext(WalletContext);

    const [modal, setModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);
    const [traitsDropdown, setTraitsDropdown] = useState([]);
    const [projectsDropdown, setProjectsDropdown] = useState([]);
    const [unlockWalletId, setUnlockWalletId] = useState("");
    const [unlockPassword, setUnlockPassword] = useState("");
    const [unlockModal, setUnlockModal] = useState([]);
    const [toastValue, setToastValue] = useState({});
    const [toast, setToast] = useState([]);

    const [projects, setProjects] = useState([]);
    const [walletPassword, setWalletPassword] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slug, setSlug] = useState("");
    const [checkSlug, setCheckSlug] = useState("");
    const [checkProject, setCheckProject] = useState(null);
    const [delay, setDelay] = useState("");
    const [price, setPrice] = useState("");
    const [maxGas, setMaxGas] = useState("");
    const [priority, setPriority] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [traits, setTraits] = useState([]);
    const [monitors, setMonitors] = useState([]);

    useEffect(() => {

        // const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        // setWalletDropdown(walletDropdown);

        const projectDropdown = new Dropdown(projectsDropdownRef.current, {});
        setProjectsDropdown(projectDropdown);

        const _traitsDropdown = new Dropdown(traitsDropdownRef.current, {});
        setTraitsDropdown(_traitsDropdown);

        const unlockModal = new Modal(unlockModalRef.current, {keyboard: false});
        setUnlockModal(unlockModal);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

        const output = ipcRenderer.sendSync('load-projects');

        setProjects(output);

        console.log(output);

        // const monitor_status_updater = (event, data) => {
        //     const output = ipcRenderer.sendSync('load-os-monitors');
        //     setMonitors(output);
        // }
        //
        // ipcRenderer.on('project-status-update', monitor_status_updater)
        //
        // return () => {
        //     ipcRenderer.removeListener('project-status-update', monitor_status_updater);
        // }

    }, [])

    useEffect(() => {

        if(typeof traits === 'undefined' || traits.length === 0) return;

        if(selectedProject === null) return;

        const arrays = [];
        for(const t of traits) {
            arrays.push(selectedProject.traitsMap.get(t));
        }

        setSelectedAssets(intersection(...arrays));

    }, [traits])

    function intersection(...arrays) {
        const myMap = new Map()

        arrays.flat().forEach(value => {
            const currentValue = myMap.get(value) ?? 0;

            myMap.set(value, currentValue + 1);
        })

        const result = []

        myMap.forEach((occurrence, value) => {
            if (occurrence === arrays.length) {
                result.push(value)
            }
        })

        return result
    }

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

    const handleTraitsFilter = (t) => {

        if(traits.includes(t)) {
            console.log("Already in traits list");
            return;
        }

        setTraits([...traits, t]);

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

                <div>
                    <div className="dropdown w-25">
                        <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                id="projects-dropdown" data-bs-toggle="dropdown"
                                aria-expanded="false"
                                ref={projectsDropdownRef}
                                onClick={() => {projectsDropdown.toggle()}}>
                            {selectedProject === null ? "Select a project" : selectedProject.slug}
                        </button>
                        <ul className="dropdown-menu">
                            {
                                projects.map((p) => (
                                    <li key={p.id}><a className="dropdown-item" onClick={() => {setSelectedProject(p)} }>{p.slug}</a></li>
                                ))
                            }
                        </ul>
                    </div>
                </div>

                <div className={selectedProject === null ? 'd-none' : ''}>
                    <div className="dropdown w-25">
                        <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                id="traits-dropdown"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                ref={traitsDropdownRef}
                                onClick={() => {traitsDropdown.toggle()}}
                        >
                            Select a Trait
                        </button>
                        <ul className="dropdown-menu">
                            {
                                selectedProject === null ? '' :
                                Array.from(selectedProject.traitsMap.keys()).map((t) => (
                                    <li key={Math.random() * Math.random() + Math.random()}><a className="dropdown-item" onClick={() => {handleTraitsFilter(t)} }>{t} ({selectedProject.traitsMap.get(t).length})</a></li>
                                ))
                            }
                        </ul>
                    </div>
                </div>

                <div style={{color: "white"}}>
                    {typeof selectedAssets !== 'undefined' ? traits.map(t => (
                        <span key={Math.random()} className={"border me-2"}>{t}</span>
                    )) : ""}
                    <div>{typeof selectedAssets !== 'undefined' ? selectedAssets.length : "N/A"}</div>
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