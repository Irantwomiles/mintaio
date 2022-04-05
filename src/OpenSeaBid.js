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
    const toastRef = useRef();

    const [wallet, setWallet] = useContext(WalletContext);

    const [walletDropdown, setWalletDropdown] = useState([]);
    const [traitsDropdown, setTraitsDropdown] = useState([]);
    const [projectsDropdown, setProjectsDropdown] = useState([]);
    const [toastValue, setToastValue] = useState({});
    const [toast, setToast] = useState([]);

    const [projects, setProjects] = useState([]);
    const [walletPassword, setWalletPassword] = useState("");
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slug, setSlug] = useState("");
    const [price, setPrice] = useState("");
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [traits, setTraits] = useState([]);
    const [bids, setBids] = useState([]);
    const [projectStatus, setProjectStatus] = useState(null);
    const [bidCount, setBidCount] = useState(0);
    const [bidTotal, setBidTotal] = useState(1);
    const [isBidding, setIsBidding] = useState(false);
    const [expiration, setExpiration] = useState(1);

    useEffect(() => {

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

        const projectDropdown = new Dropdown(projectsDropdownRef.current, {});
        setProjectsDropdown(projectDropdown);

        const _traitsDropdown = new Dropdown(traitsDropdownRef.current, {});
        setTraitsDropdown(_traitsDropdown);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

        const output = ipcRenderer.sendSync('load-projects');

        setProjects(output);

        const status_updater = (event, data) => {
            setBidCount(data[data.length - 1].count);
            setBidTotal(data[data.length - 1].total_count);
            setBids(data);
        }

        const project_status_updater = (event, data) => {
            setProjectStatus(data);
        }

        const update_projects = () => {
            const output = ipcRenderer.sendSync('load-projects');
            setProjects(output);
        }

        ipcRenderer.on('os-bid-status-update', status_updater);
        ipcRenderer.on('project-status-update', project_status_updater);
        ipcRenderer.on('project-status-finished', update_projects);

        return () => {
            ipcRenderer.removeListener('os-bid-status-update', status_updater);
            ipcRenderer.removeListener('project-status-update', project_status_updater);
        }

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

    const handleTraitsFilter = (t) => {

        if(traits.includes(t)) {
            console.log("Already in traits list");
            return;
        }

        setTraits([...traits, t]);

    }

    const handleStart = (data) => {

        if(slug.length === 0) {
            setToastValue({
                message: "Please type the project slug.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        const output = ipcRenderer.sendSync("start-fetching-project", data);

        if(output.error === 1) {
            setToastValue({
                message: "Error occured.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "There is already a project fetching assets.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        setProjects(output.projects);

        setToastValue({
            message: "Fetching project traits.",
            color: "#45d39d"
        });

        toast.show();
    }

    const handleStop = (data) => {
        const output = ipcRenderer.sendSync("stop-fetching-project", data);

        if(output.error === 1) {
            setToastValue({
                message: "Could not find project.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        setToastValue({
            message: "Stopped fetching traits.",
            color: "#45d39d"
        });

        const _projects = ipcRenderer.sendSync('load-projects');
        setProjects(_projects);

        toast.show();
    }

    const startBidding = (data) => {

        if(selectedAssets.length === 0) {
            setToastValue({
                message: "No assets selected.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(selectedProject === null) {
            setToastValue({
                message: "No project selected.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(isNaN(price)) {
            setToastValue({
                message: "Price must be a number.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(isNaN(expiration)) {
            setToastValue({
                message: "Expiration must be a number.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(selectedWallet === null) {
            setToastValue({
                message: "No wallet selected.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(walletPassword.length === 0) {
            setToastValue({
                message: "Enter your wallets password.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        const output = ipcRenderer.sendSync("start-bidding", {
            assets: selectedAssets,
            project: selectedProject,
            price: Number.parseFloat(price),
            walletPassword: walletPassword,
            wallet: selectedWallet,
            expiration: expiration
        });

        if(output.error === 1) {
            setToastValue({
                message: "You are already bidding on a project.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "Selected project is null.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(output.error === 3) {
            setToastValue({
                message: "Error occured.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        if(output.error === 4) {
            setToastValue({
                message: "Incorrect wallet password.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        setBidCount(0);
        setBidTotal(1);
        setIsBidding(true);

        setToastValue({
            message: `Started bidding on ${selectedAssets.length} assets.`,
            color: "#45d39d"
        });
        toast.show();
    }

    const stopBidding = (data) => {
        const output = ipcRenderer.sendSync("stop-bidding");

        if(output.error === 1 || output.error === 2) {
            setToastValue({
                message: "You are not bidding on anything.",
                color: "#ff4949"
            });
            toast.show();
            return;
        }

        setIsBidding(false);

        setToastValue({
            message: `Stopped bidding.`,
            color: "#45d39d"
        });
        toast.show();
    }

    function getBidMessageClass(status) {
        switch(status) {
            case 0:
                return 'bid-not-sent'
            case 1:
                return 'bid-success'
            case 2:
                return 'bid-error'
        }
    }

    function getProjectStatusClass(status) {
        switch(status) {
            case 0:
                return 'project-success'
            case 1:
                return 'project-throttled'
            case 2:
                return 'project-error'
            case 3:
                return 'project-throttled'
            case 4:
                return 'project-throttled'
            case 5:
                return 'project-finished'
            case 6:
                return 'project-stopped'
        }
    }

    return (
        <div className="opensea-bid-wrapper p-3 h-100">

            <div className={"w-100"}>
                <h3 style={{fontWeight: "bold", color: "white"}}>OpenSea Bidding</h3>

                <div className={"d-flex flex-column tasks-actionbar rounded-3 p-3 mb-2"}>

                    <div className={"d-flex justify-content-between"}>
                        <div>
                            <label htmlFor="slug-address" className="form-label" style={{color: "white", fontWeight: "bold"}}>Project Slug</label>
                            <div className="input-group">
                                <input type="text" className="form-control" id="slug-address" placeholder="Project Slug" onChange={(e) => {setSlug(e.target.value)}} value={slug} />
                            </div>
                        </div>
                        <div className={"mt-auto"}>
                            <button className={"btn btn-add me-2"} onClick={() => {handleStart({slug: slug})}}>Find Traits</button>
                            <button className={"btn btn-cancel"} onClick={() => {handleStop({slug: slug})}}>Stop</button>
                        </div>
                    </div>

                    {projectStatus === null ? '' :
                        <div className={"project-fetching d-flex justify-content-between p-3 mt-3"}>
                            <div>
                                <span className={"me-5"} style={{color:"white", fontWeight: "bold"}}>{projectStatus.slug}</span>
                                <span className={`${getProjectStatusClass(projectStatus.error)}`}>{projectStatus.message}</span>
                            </div>

                            <span style={{color: "#ffc76f"}}>
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            This process may take a few minutes.
                            </span>
                        </div>
                    }

                </div>

                <div className={"d-flex flex-column tasks-actionbar rounded-3 p-3"}>
                    <div className="d-flex mt-3">
                        <div className="dropdown w-25">
                            <button className="btn btn-add dropdown-toggle w-100" type="button"
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

                    <div className={"w-100 mt-3"}>

                        <div className={"d-flex"}>
                            <div className="dropdown w-25 me-2">
                                <button className="btn btn-add dropdown-toggle w-100" type="button"
                                        id="projects-dropdown" data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        ref={projectsDropdownRef}
                                        onClick={() => {projectsDropdown.toggle()}}>
                                    {selectedProject === null ? "Select a project" : selectedProject.slug}
                                </button>
                                <ul className="dropdown-menu">
                                    {
                                        typeof projects !== 'undefined' ?
                                        projects.map((p) => (
                                            <li key={p.id}><a className="dropdown-item" onClick={() => {setSelectedProject(p)} }>{p.slug}</a></li>
                                        ))
                                            : ''
                                    }
                                </ul>
                            </div>

                            <div className={selectedProject === null ? 'd-none w-100' : 'w-100'}>
                                <div className="dropdown w-25">
                                    <button className="btn btn-add dropdown-toggle w-100" type="button"
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

                        </div>


                        <div className={"d-flex justify-content-evenly w-100"}>
                            <div className={"d-flex flex-wrap w-75 mt-3"} style={{color: "white"}}>
                                {typeof selectedAssets !== 'undefined' ? traits.map(t => (
                                    <div key={Math.random()} className={"trait-selected rounded p-2 me-1 mb-1"}>
                                        <span>{t}</span>
                                    </div>

                                )) : ""}
                            </div>
                            <div className={"w-25 mt-3"} style={{color: "white", textAlign: "right"}}>{selectedAssets.length} assets found</div>
                        </div>

                    </div>

                    <div>{typeof selectedAssets !== 'undefined' ?
                        <div className={"d-flex mt-2 justify-content-between"}>
                            <div className={"d-flex"}>
                                <div className={"me-2"}>
                                    <label htmlFor="slug-address" className="form-label" style={{color: "white", fontWeight: "bold"}}>Price</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control" placeholder="Bid Price" onChange={(e) => {setPrice(e.target.value)}} value={price} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="slug-address" className="form-label" style={{color: "white", fontWeight: "bold"}}>Expiration (in hours)</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control" placeholder="Expiration in hours" onChange={(e) => {setExpiration(e.target.value)}} value={expiration} />
                                    </div>
                                </div>

                                <div className={"mt-auto ms-3"}>
                                    {isBidding ?
                                        <span style={{color: "white"}}>{bidCount}/{bidTotal} bids sent</span>
                                        : ''
                                    }
                                </div>
                            </div>
                            <div className={"mt-auto"}>
                                <button className={"btn btn-wallet me-2"} onClick={startBidding}>Start Bidding</button>
                                <button className={"btn btn-cancel mt-auto"} onClick={stopBidding}>Stop Bidding</button>
                            </div>
                        </div>
                        : "N/A"}
                    </div>
                </div>

            </div>

            <div className={"bids-content"}>
                {
                    typeof bids !== 'undefined' && bids.length > 0 ?
                        bids.map((bid) => (
                            <div key={Math.random() * Math.random() + Math.random()} className={"bids d-flex justify-content-between p-3 my-1 row"}>
                                <div className={"bid-element col-3"}>
                                    <span style={{color: "white"}}>{bid.price}</span>
                                </div>
                                <div className={"bid-element col-3"}>
                                    <span style={{color: "white"}}>{bid.token_id}</span>
                                </div>
                                <div className={"bid-element col-3"}>
                                    <span style={{color: "white"}}>{bid.expiration}hr</span>
                                </div>
                                <div className={"bid-element col-3"}>
                                    <span className={`${getBidMessageClass(bid.status)}`}>{bid.message}</span>
                                </div>
                            </div>
                        )).reverse()
                        :
                        ''
                }
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