import './style.scss';
import {useContext, useEffect, useRef, useState} from "react";
import { WalletContext } from "./state/WalletContext";
import {Modal, Toast, Dropdown} from "bootstrap";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Tasks() {

    const [wallet, setWallet] = useContext(WalletContext);

    const modalRef = useRef();
    const walletDropdownRef = useRef();

    const [modal, setModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);

    const [methodObj, setMethodObj] = useState(null);
    const [contract, setContract] = useState("");
    const [inputs, setInputs] = useState([]);
    const [selectedWallet, setSelectedWallet] = useState(null);
    const [walletPassword, setWalletPassword] = useState("");

    const handleCheck = (e) => {

        if(contract.length === 0) return; //send toast

        let output = ipcRenderer.sendSync('contract-info', contract);

        if(output.error === 1) return; //send toast

        setMethodObj(output.obj);
        // send toast
    }

    useEffect(() => {

        const modal = new Modal(modalRef.current, {keyboard: false});
        setModal(modal);

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

    }, []);

    useEffect(() => {

        if(methodObj === null) return;



    }, [methodObj])

    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex">
                <div className="new-task m-1" onClick={() => {modal.show()}}>
                    <span><i className="fas fa-plus-circle"></i></span>
                    <span className="ms-2">New Task</span>
                </div>
            </div>

            <div className="tasks-list mt-3">

                <div className="d-flex justify-content-between p-3">
                    <div>
                        <span style={{color: 'white'}}>Wallet 1</span>
                    </div>
                    <div>
                        <span style={{color: 'white'}}>Contract Address</span>
                    </div>
                    <div>
                        <span style={{color: 'white'}}>Status</span>
                    </div>
                    <div style={{color: 'white'}}>
                        <span className="ms-1 me-1"><i className="fas fa-play-circle"></i></span>
                        <span className="ms-1 me-1"><i className="fas fa-pause-circle"></i></span>
                        <span className="ms-1 me-1"><i className="fas fa-trash-alt"></i></span>
                    </div>
                </div>

            </div>


            <div className="modal" ref={modalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">New Task</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex">
                                <input type="text" className="form-control w-75 m-1" aria-describedby="private-key" onChange={(e) => {setContract(e.target.value)}} placeholder="Contract Address" value={contract}/>
                                <button type="text" className="form-control btn-add w-25 m-1" onClick={handleCheck}>Check</button>
                            </div>
                            <div className="d-flex justify-content-evenly">
                                <input type="text" className="form-control m-1" placeholder="Price in ether"/>
                                <input type="text" className="form-control m-1" placeholder="Gas price"/>
                                <input type="text" className="form-control m-1" placeholder="Gas limit"/>
                            </div>

                            <div className="d-flex">
                                <div className="dropdown w-25 m-1">
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
                                <input type="text" className="form-control w-75 m-1" onChange={(e) => {setWalletPassword(e.target.value)}} placeholder="Password"/>
                            </div>

                            {
                                methodObj !== null ?
                                    <div className="d-flex flex-column mint-forms mt-3 m-1">
                                        <div className="d-flex mt-3">
                                            <input type="text" className="form-control w-50" onChange={() => {}} placeholder="Function name" value={methodObj.name}/>
                                        </div>
                                        {
                                            methodObj.inputs.length > 0 ?
                                                <div>
                                                    <label className="mt-2 mb-1" style={{color: "white"}}>Arguments</label>
                                                    {
                                                        methodObj.inputs.map((input, index) => (
                                                            <div key={Math.random()}>
                                                                <input type="text" className="form-control w-25" placeholder={input.name}/>
                                                            </div>
                                                        ))
                                                    }

                                                </div>
                                                :
                                                ''
                                        }
                                    </div>
                                    :
                                    ''
                            }

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add">Add Task</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default Tasks;