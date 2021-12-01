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

    const [contract, setContract] = useState("");

    const [inputs, setInputs] = useState([]);
    const [functionName, setFunctionName] = useState("");
    const [methodObj, setMethodObj] = useState(null);

    const [selectedWallet, setSelectedWallet] = useState(null);
    const [walletPassword, setWalletPassword] = useState("");

    const [price, setPrice] = useState("");
    const [gas, setGas] = useState("");
    const [gasLimit, setGasLimit] = useState("");

    const [tasks, setTasks] = useState([]);

    // 0x63e0Cd76d11da01aef600E56175523aD39e35b01

    const handleCheck = (e) => {

        if(contract.length === 0) return; //send toast

        let output = ipcRenderer.sendSync('contract-info', contract);

        if(output.error === 1) return; //send toast

        setMethodObj(output.obj);
        for(const i of output.obj.inputs) {
            setInputs([...inputs, {name: i.name, value: ''}]);
        }
        setInputs(output.obj.inputs);
        // send toast
    }

    const handleAdd = (e) => {

        if(contract.length === 0) return; //send toast
        if(price.length === 0) return; //send toast
        if(gas.length === 0) return; //send toast
        if(gasLimit.length === 0) return; //send toast
        if(walletPassword.length === 0) return; //send toast
        if(selectedWallet === null) return; // send toast
        if(functionName.length === 0) return;

        let args = [];

        for(const i of inputs) {
            args.push(i.value);
            if(i.value.length === 0) return; // send toast
        }

        const output = ipcRenderer.sendSync('add-task', {
            contractAddress: contract,
            price: price,
            gas: gas,
            gasLimit: gasLimit,
            walletPassword: walletPassword,
            walletId: selectedWallet.id,
            args: args,
            functionName: functionName
        });

        if(output.error === 1) return;
        if(output.error === 2) return;

        setTasks(output.tasks);
    }

    const handleDelete = (e, id) => {

        const output = ipcRenderer.sendSync('delete-task', id);

        setTasks(output.tasks);
    }

    const handleStart = (e, id) => {
        const output = ipcRenderer.sendSync('start-task', id);

        if(output.error === 1) {
            setTasks(output.tasks);
        }

        console.log(output);
    }

    const handleInput = (e, index) => {
        let values = [...inputs];
        values[index].value = e.target.value;
        setInputs(values);
    }


    useEffect(() => {

        const loadTasks = () => {

            const tasks = ipcRenderer.sendSync("load-tasks");

            setTasks(tasks);
        }

        loadTasks();

        const modal = new Modal(modalRef.current, {keyboard: false});
        setModal(modal);

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

        const task_status_updater = (event, data) => {
            console.log(data);
        }

        ipcRenderer.on('task-status-update', task_status_updater)

        return () => {
            ipcRenderer.removeListener('task-status-update', task_status_updater);
        }

    }, []);

    useEffect(() => {
        if(methodObj !== null) {
            setFunctionName(methodObj.name);
        }
    }, [methodObj]);

    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex">
                <div className="new-task m-1" onClick={() => {modal.show()}}>
                    <span><i className="fas fa-plus-circle"></i></span>
                    <span className="ms-2">New Task</span>
                </div>
            </div>

            <div className="tasks-list mt-3">

                {
                    tasks.length > 0 ?

                        tasks.map((task, index) => (
                            <div key={Math.random()} className="d-flex justify-content-between p-3">
                                <div>
                                    <span style={{color: 'white'}}>{task.privateKey !== null ? '' :
                                        <i className="fas fa-lock me-2"></i>}{task.publicKey}</span>
                                </div>
                                <div>
                                    <span style={{color: 'white'}}>{task.contract_address}</span>
                                </div>
                                <div>
                                    <span style={{color: 'white'}}>Status</span>
                                </div>
                                <div style={{color: 'white'}}>
                                    <span className="ms-1 me-1" onClick={(e) => {handleStart(e, task.id)}}><i className="fas fa-play-circle"></i></span>
                                    <span className="ms-1 me-1"><i className="fas fa-pause-circle"></i></span>
                                    <span className="ms-1 me-1" onClick={(e) =>{handleDelete(e, task.id)}}><i className="fas fa-trash-alt"></i></span>
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
                            <h5 className="modal-title">New Task</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex">
                                <input type="text" className="form-control w-75 m-1" aria-describedby="private-key" onChange={(e) => {setContract(e.target.value)}} placeholder="Contract Address" value={contract}/>
                                <button type="text" className="form-control btn-add w-25 m-1" onClick={handleCheck}>Check</button>
                            </div>
                            <div className="d-flex justify-content-evenly">
                                <input type="number" className="form-control m-1" onChange={(e) => {setPrice(e.target.value)}} value={price || ''} placeholder="Price in ether"/>
                                <input type="text" className="form-control m-1" onChange={(e) => {setGas(e.target.value)}} value={gas || ''} placeholder="Gas price"/>
                                <input type="text" className="form-control m-1" onChange={(e) => {setGasLimit(e.target.value)}} value={gasLimit || ''} placeholder="Gas limit"/>
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
                                <input type="password" className="form-control w-75 m-1" onChange={(e) => {setWalletPassword(e.target.value)}} placeholder="Password" value={walletPassword}/>
                            </div>

                            {
                                methodObj !== null ?
                                    <div className="d-flex flex-column mint-forms mt-3 m-1">
                                        <div className="d-flex mt-3">
                                            <input type="text" className="form-control w-50" onChange={(e) => {setFunctionName(e.target.value)}} placeholder="Function name" value={functionName}/>
                                        </div>
                                        {
                                            inputs.length > 0 ?
                                                <div>
                                                    <label className="mt-2 mb-1" style={{color: "white"}}>Arguments</label>
                                                    {
                                                        inputs.map((input, index) => (
                                                            <div key={index}>
                                                                <input type="text" className="form-control w-25" onChange={(e) => { handleInput(e, index) } } placeholder={input.name} value={input.value || ''}/>
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
                            <button type="button" className="btn btn-add" onClick={(e) => {handleAdd(e)}}>Add Task</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default Tasks;