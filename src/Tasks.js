import './style.scss';
import {useContext, useEffect, useRef, useState} from "react";
import { WalletContext } from "./state/WalletContext";
import { TaskContext } from "./state/TaskContext";
import {Modal, Toast, Dropdown} from "bootstrap";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Tasks() {

    const [wallet, setWallet] = useContext(WalletContext);
    const [tasks, setTasks] = useContext(TaskContext);

    const modalRef = useRef();
    const taskModalRef = useRef();
    const unlockModalRef = useRef();
    const walletDropdownRef = useRef();
    const toastRef = useRef();
    const methodsDropdownRef = useRef();
    const readMethodsDropdownRef = useRef();
    const updateRef = useRef();
    const updateWalletDropdownRef = useRef();
    const updateMethodsDropdownRef = useRef();
    const updateReadMethodsDropdownRef = useRef();

    const [toast, setToast] = useState([]);
    const [modal, setModal] = useState([]);
    const [updateModal, setUpdateModal] = useState([]);
    const [taskModal, setTaskModal] = useState([]);
    const [unlockModal, setUnlockModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);
    const [toastValue, setToastValue] = useState({});
    const [methodsDropdown, setMethodsDropdown] = useState([]);
    const [readDropdown, setReadDropdown] = useState([]);
    const [updateWalletDropdown, setUpdateWalletDropdown] = useState([]);
    const [updateMethodsDropdown, setUpdateMethodsDropdown] = useState([]);
    const [updateReadDropdown, setUpdateReadDropdown] = useState([]);
    const [abi, setAbi] = useState("");
    const [contractCreator, setContractCreator] = useState("");

    const [contract, setContract] = useState("");

    const [inputs, setInputs] = useState([]);
    const [functionName, setFunctionName] = useState("");
    const [readFunctionName, setReadFunctionName] = useState("");
    const [readValue, setReadValue] = useState("");
    const [methods, setMethods] = useState([]);
    const [readMethods, setReadMethods] = useState([]);

    const [selectedWallet, setSelectedWallet] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedReadMethod, setSelectedReadMethod] = useState(null);
    const [walletPassword, setWalletPassword] = useState("");

    const [price, setPrice] = useState("");
    const [gas, setGas] = useState("");
    const [gasPriorityFee, setGasPriorityFee] = useState("");
    const [gasLimit, setGasLimit] = useState("-1");
    const [amount, setAmount] = useState("");

    const [unlockWalletId, setUnlockWalletId] = useState("");
    const [unlockPassword, setUnlockPassword] = useState("");
    const [selectedTask, setSelectedTask] = useState(null);
    const [mode, setMode] = useState("MANUAL");
    const [updateMode, setUpdateMode] = useState("MANUAL");

    const [timer, setTimer] = useState("");

    // 0x63e0Cd76d11da01aef600E56175523aD39e35b01
    // 0x5238Cb24ebe339A1D0C82A39356Fd3f9101604F1

    const handleCheck = (e) => {

        if(contract.length === 0 && abi.length === 0) return; //send toast

        let output = ipcRenderer.sendSync('contract-info', {contract, abi});

        console.log("output:", output);

        if(output.error === 1) {
            setMethods([]);
            setReadMethods([]);

            setToastValue({
                message: "Could not get contract ABI.",
                color: "#d97873"
            });
            toast.show();
            return;
        } //send toast

        setMethods(output.obj.payable_methods);
        setReadMethods(output.obj.view_methods);
        // send toast
    }

    const handleAdd = (e) => {

        if(contract.length === 0 || price.length === 0 || amount.length === 0 || gas.length === 0 || gasPriorityFee.length === 0 || walletPassword.length === 0 || selectedWallet === null || functionName.length === 0 || gasLimit.length === 0) {
            setToastValue({
                message: "You must fill out all of the input fields.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        let args = [];

        for(const i of inputs) {
            args.push(i.value);
            if(i.value.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }
        }

        if(mode === 'AUTOMATIC') {

            if(readValue.length === 0 || selectedReadMethod.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }

        } else if(mode === 'TIMER') {
            if(timer.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }
        }

        const output = ipcRenderer.sendSync('add-task', {
            contractAddress: contract,
            price: price,
            amount: amount,
            gas: gas,
            gasPriorityFee: gasPriorityFee,
            gasLimit: gasLimit,
            walletPassword: walletPassword,
            walletId: selectedWallet.id,
            args: args,
            functionName: functionName,
            readFunction: readFunctionName,
            readCurrentValue: readValue,
            timestamp: timer,
            mode: mode,
            contractCreator: contractCreator
        });

        if(output.error === 1) {
            setToastValue({
                message: "Invalid wallet ID.",
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

        if(output.error === 3) {
            setToastValue({
                message: "Error while creating task.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 4) {
            setToastValue({
                message: "Tasks are active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setTasks(output.tasks);
        modal.hide();

        setContract('');
        setPrice('');
        setGas('');
        setGasPriorityFee('');
        setWalletPassword('');
        setSelectedWallet(null);
        setFunctionName('');
        setInputs([]);
        setSelectedMethod(null);
        setMethods([]);
        setAmount("");
        setTimer("");
        setReadMethods([]);
        setSelectedReadMethod("");
        setReadValue("");
        setContractCreator("");
        setAbi("");

        setToastValue({
            message: "New task created successfully.",
            color: "#73d9b0"
        });
        toast.show();
    }

    const handleDelete = (e, id) => {

        const output = ipcRenderer.sendSync('delete-task', id);

        if(output.error === 1) {
            setToastValue({
                message: "Could not find this task.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "Unknown error occurred.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setTasks(output.tasks);

        setToastValue({
            message: "Deleted task successfully.",
            color: "#73d9b0"
        });
        toast.show();
    }

    const handleStart = (e, id) => {
        const output = ipcRenderer.sendSync('start-task', id);

        if(output.error === 1) {
            setToastValue({
                message: "Could not find this task.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "You must unlock your wallet first.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 3) {
            setToastValue({
                message: "This task is already active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setTasks(output.tasks);

        setToastValue({
            message: "Started task successfully.",
            color: "#73d9b0"
        });

        toast.show();
    }

    const handleStop = (e, id) => {
        const output = ipcRenderer.sendSync('stop-task', id);

        if(output.error === 1) {
            setToastValue({
                message: "Could not find this task.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 2) {
            setToastValue({
                message: "You must unlock your wallet first.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 3) {
            setToastValue({
                message: "This task is already active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setTasks(output.tasks);

        setToastValue({
            message: "Stopped task successfully.",
            color: "#73d9b0"
        });

        toast.show();
    }

    const handleInput = (e, index) => {
        let values = [...inputs];
        values[index].value = e.target.value;
        setInputs(values);
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

    const handleUnlockWallet = (task) => {
        setUnlockWalletId(task.walletId);
        unlockModal.show();
    }

    const unlockWallet = () => {

        unlockModal.hide();

        const output = ipcRenderer.sendSync('unlock-wallet', {walletId: unlockWalletId, password: unlockPassword});

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

        setTasks(output.tasks);

        setToastValue({
            message: "Wallet unlocked.",
            color: "#73d9b0"
        });

        toast.show();
    }

    const handleTaskModal = (task) => {

        if(task.status.error !== 1 && task.status.error !== 2) {
            return;
        }

        setSelectedTask(task);

        taskModal.show();
    }

    const handleMethodSelect = (method) => {
        setSelectedMethod(method);
        setFunctionName(method.name);

        let inputValues = [];

        for(const i of method.inputs) {
            inputValues.push({name: i.name, value: ''});
        }

        setInputs(inputValues);
    }

    const handleReadMethodSelect = (method) => {
        setSelectedReadMethod(method);
        setReadFunctionName(method.name);
    }

    const handleLoadABI = (e, id) => {

        let output = ipcRenderer.sendSync('load-task-abi', id);

        setTasks(output.tasks);
    }

    const handleStartAll = () => {
        let output = ipcRenderer.sendSync('start-all-tasks');

        setTasks(output);
    }

    const handleStopAll = () => {
        let output = ipcRenderer.sendSync('stop-all-tasks');

        setTasks(output);
    }

    const handleDeleteAll = () => {

        if(tasks.length === 0) {
            setToastValue({
                message: "You don't have any tasks to delete.",
                color: "#d97873"
            });

            toast.show();
            return;
        }

        let output = ipcRenderer.sendSync('delete-all-tasks');

        if(output.error === 1) {
            setToastValue({
                message: "Error while deleting all tasks.",
                color: "#d97873"
            });
            toast.show();
            setTasks(output.tasks);
            return;
        }

        setToastValue({
            message: "Deleted all tasks successfully.",
            color: "#73d9b0"
        });
        toast.show();

        setTasks(output.tasks);
    }

    const handleEdit = (task) => {

        setSelectedTask(task);

        setContract(task.contract_address);
        setPrice(task.price);
        setAmount(task.amount);
        setGas(task.gas);
        setGasPriorityFee(task.gasPriorityFee);
        setUpdateMode(task.start_mode);

        updateModal.show();
    }

    const handleUpdate = (e) => {

        if(contract.length === 0 || price.length === 0 || amount.length === 0 || gas.length === 0 || gasPriorityFee.length === 0 || walletPassword.length === 0 || selectedWallet === null || functionName.length === 0) {
            setToastValue({
                message: "You must fill out all of the input fields.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        let args = [];

        for(const i of inputs) {
            args.push(i.value);
            if(i.value.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }
        }

        if(mode === 'AUTOMATIC') {

            if(readValue.length === 0 || selectedReadMethod.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }

        } else if(mode === 'TIMER') {
            if(timer.length === 0) {
                setToastValue({
                    message: "You must fill out all of the input fields.",
                    color: "#d97873"
                });
                toast.show();
                return;
            }
        }

        const output = ipcRenderer.sendSync('update-task', {
            taskId: selectedTask.id,
            contractAddress: contract,
            price: price,
            amount: amount,
            gas: gas,
            gasPriorityFee: gasPriorityFee,
            walletPassword: walletPassword,
            walletId: selectedWallet.id,
            args: args,
            functionName: functionName,
            readFunction: readFunctionName,
            readCurrentValue: readValue,
            timestamp: timer,
            mode: updateMode
        });

        if(output.error === 1) {
            setToastValue({
                message: "Invalid wallet ID.",
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

        if(output.error === 3) {
            setToastValue({
                message: "Error while updating task.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        if(output.error === 4) {
            setToastValue({
                message: "Tasks are active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setTasks(output.tasks);
        updateModal.hide();

        setContract('');
        setPrice('');
        setGas('');
        setGasPriorityFee('');
        setWalletPassword('');
        setSelectedWallet(null);
        setFunctionName('');
        setInputs([]);
        setSelectedMethod(null);
        setMethods([]);
        setAmount("");
        setTimer("");
        setReadMethods([]);
        setSelectedReadMethod("");
        setReadValue("");
    }

    const getTaskStatus = (task) => {

        switch(task.status.error) {
            case -1:
                return 'Inactive';
            case 0:
                return 'Starting'
            case 1:
                return 'Successful Mint'
            case 2:
                return 'Error'
            case 3:
                return 'Pending'
            case 4:
                return 'Missing ABI'
            case 5:
                return 'Waiting...'
            case 6:
                return 'Waiting...'
            case 7:
                return 'No Timestamp'
            case 8:
                return 'Timestamp NaN'
            case 9:
                return task.status.result.message
            case 10:
                return task.status.result.message
            case 11:
                return 'Missing Values'
            case 12:
                return 'Creator N/A'
            case 13:
                return 'Waiting for Tx'
        }

        return 'Unknown State';
    }

    useEffect(() => {

        const modal = new Modal(modalRef.current, {keyboard: false});
        setModal(modal);

        const tModal = new Modal(taskModalRef.current, {keyboard: false});
        setTaskModal(tModal);

        const unlockModal = new Modal(unlockModalRef.current, {keyboard: false});
        setUnlockModal(unlockModal);

        const update_modal = new Modal(updateRef.current, {keyboard: false});
        setUpdateModal(update_modal);

        const walletDropdown = new Dropdown(walletDropdownRef.current, {});
        setWalletDropdown(walletDropdown);

        const update_wallet_dropdown = new Dropdown(updateWalletDropdownRef.current, {});
        setUpdateWalletDropdown(update_wallet_dropdown);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

        const output = ipcRenderer.sendSync('load-tasks');

        setTasks(output);

        const task_status_updater = (event, data) => {
            const output = ipcRenderer.sendSync('load-tasks');
            setTasks(output);
        }

        ipcRenderer.on('task-status-update', task_status_updater)

        return () => {
            ipcRenderer.removeListener('task-status-update', task_status_updater);
        }

    }, []);

    useEffect(() => {
        if(methods.length > 0) {
            const methodsDropdown = new Dropdown(methodsDropdownRef.current, {});
            setMethodsDropdown(methodsDropdown);

            const update_methods_dropdown = new Dropdown(updateMethodsDropdownRef.current, {});
            setUpdateMethodsDropdown(update_methods_dropdown);

        }
    }, [methods]);

    useEffect(() => {
        if(readMethods.length > 0) {
            const readMethodDropdown = new Dropdown(readMethodsDropdownRef.current, {});
            setReadDropdown(readMethodDropdown);

            const update_read_dropdown = new Dropdown(updateReadMethodsDropdownRef.current, {});
            setUpdateReadDropdown(update_read_dropdown);

        }
    }, [readMethods]);

    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex justify-content-between">
                <div>
                    <div className="new-task m-1 me-4" onClick={() => {modal.show()}}>
                        <span><i className="fas fa-plus-circle"></i></span>
                        <span className="ms-2">New Task</span>
                    </div>
                </div>
                <div className="d-flex">
                    <div className="new-task m-1 me-4" onClick={() => {handleStartAll()}}>
                        <span><i className="fas fa-play-circle"></i></span>
                        <span className="ms-2">Start All</span>
                    </div>
                    <div className="new-task m-1 me-4" onClick={() => {handleStopAll()}}>
                        <span><i className="fas fa-stop-circle"></i></span>
                        <span className="ms-2">Stop All</span>
                    </div>
                    <div className="new-task m-1" onClick={() => {handleDeleteAll()}}>
                        <span><i className="fas fa-trash-alt"></i></span>
                        <span className="ms-2">Delete All</span>
                    </div>
                </div>
            </div>

            <div className="tasks-list mt-3">

                {
                    tasks.length > 0 ?
                        <div className="row d-flex p-3">
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Wallet</span></div>
                            <div className="col-6 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Contract Address</span></div>
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Current Status</span></div>
                            <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Actions</span></div>
                        </div>
                        :
                        ''
                }

                {
                    tasks.length > 0 ?

                        tasks.map((task) => (
                            <div key={Math.random()} className="row d-flex p-3">
                                <div className="col-2" style={{textAlign: 'center'}}>
                                    {
                                        task.privateKey !== null ? <span style={{color: '#45d39d'}}><i className="fas fa-unlock me-2"></i></span> :
                                        <span style={{color: '#8a78e9'}} onClick={() => {handleUnlockWallet(task)} }><i className="fas fa-lock me-2"></i></span>
                                    }
                                    <span style={{color: 'white'}}>{getWalletName(task.publicKey)}</span>
                                </div>
                                <div className="col-6" style={{textAlign: 'center'}}>
                                    <span style={{color: 'white'}}>{task.contract_address}</span>
                                </div>
                                <div className="col-2" style={{textAlign: 'center'}}>
                                    <span onClick={() => {handleTaskModal(task)}} className={
                                        task.status.error === -1 ?
                                            'status-inactive' : task.status.error === 0 ?
                                                'status-starting' :  task.status.error === 1 ?
                                                    'status-success' : task.status.error === 2 ?
                                                        'status-error' : 'status-pending'
                                    }>
                                        {getTaskStatus(task)}
                                    </span>
                                </div>
                                <div className="col-2" style={{color: 'white', textAlign: 'center'}}>
                                    <span className="ms-1 me-1 start-btn" onClick={(e) => {handleStart(e, task.id)}}><i className="fas fa-play-circle"></i></span>
                                    <span className="ms-1 me-1 stop-btn" onClick={(e) => {handleStop(e, task.id)}}><i className="fas fa-stop-circle"></i></span>

                                    {
                                        task.abi === null ?
                                            <span className="ms-1 me-1 load-abi-btn" onClick={(e) => handleLoadABI(e, task.id)}><i className="fas fa-sync-alt"></i></span>
                                            :
                                            ''
                                    }
                                    <span className="ms-1 me-1 edit-btn" onClick={(e) =>{handleEdit(task)}}><i className="fas fa-pencil-alt"></i></span>
                                    <span className="ms-1 me-1 delete-btn" onClick={(e) =>{handleDelete(e, task.id)}}><i className="fas fa-trash-alt"></i></span>
                                </div>
                            </div>
                        ))
                        :
                        <div className="d-flex justify-content-center align-items-center w-100 h-100">
                            <h1 style={{color: "rgba(70, 171, 97, 0.4)"}}>Mint</h1><h1 style={{color: "rgba(48,122,69,0.4)"}}>AIO</h1>
                        </div>
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
                                <div className={"w-75"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Contract Address</label>
                                    <input type="text" className="form-control m-1" aria-describedby="private-key" onChange={(e) => {setContract(e.target.value)}} placeholder="Contract Address" value={contract}/>
                                </div>

                                <button type="text" className="form-control btn-add w-25 mt-auto ms-3 m-1" onClick={handleCheck}>Check</button>
                            </div>

                            <div className={"m-1"}>
                                <label className={"mb-1"} style={{color: "white"}}>ABI Manual Entry</label>
                                <textarea className={"w-100"} onChange={(e) => {setAbi(e.target.value)}} value={abi} />
                            </div>

                            <div className="d-flex mb-2">
                                <div className={"w-100"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Contract Creator</label>
                                    <input type="text" className="form-control" onChange={(e) => {setContractCreator(e.target.value)}} placeholder="Contract Address" value={contractCreator}/>
                                </div>

                                <div className={"w-100"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Gas Limit</label>
                                    <input type="number" className="form-control" onChange={(e) => {setGasLimit(e.target.value)}} placeholder="Gas Limit" value={gasLimit}/>
                                </div>
                            </div>

                            <div className="d-flex justify-content-evenly">
                                <div className={"m-1"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Price</label>
                                    <input type="number" className="form-control" onChange={(e) => {setPrice(e.target.value)}} value={price || ''} placeholder="Price in ether"/>
                                </div>
                                <div className={"m-1"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Amount</label>
                                    <input type="number" min="1" className="form-control" onChange={(e) => {setAmount(e.target.value)}} value={amount || ''} placeholder="Total amount"/>
                                </div>
                                <div className={"m-1"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Max Gas Price</label>
                                    <input type="text" className="form-control" onChange={(e) => {setGas(e.target.value)}} value={gas || ''} placeholder="Max gas price"/>
                                </div>
                                <div className={"m-1"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Priority Gas Fee</label>
                                    <input type="text" className="form-control" onChange={(e) => {setGasPriorityFee(e.target.value)}} value={gasPriorityFee || ''} placeholder="Gas Priority Fee"/>
                                </div>

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

                            <div className="m-1">

                                <div>
                                    <input
                                        type="radio"
                                        name="manual"
                                        value="Manual"
                                        checked={mode === "MANUAL"}
                                        onChange={() => {
                                            setMode("MANUAL")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Manual Mode</span>
                                </div>

                                <div>
                                    <input
                                        type="radio"
                                        name="automatic"
                                        value="Automatic"
                                        checked={mode === "AUTOMATIC"}
                                        onChange={() => {
                                            setMode("AUTOMATIC")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Automatic Mode</span>
                                </div>

                                <div>
                                    <input
                                        type="radio"
                                        name="timer"
                                        value="Timer"
                                        checked={mode === "TIMER"}
                                        onChange={() => {
                                            setMode("TIMER")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Timed Mode</span>

                                </div>

                            </div>

                            {
                                methods.length > 0 ?
                                    <div className="d-flex flex-column mint-forms mt-3 m-1">

                                        <div className="d-flex w-100">
                                            <div className="dropdown w-50 mt-3 me-3">
                                                <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                                        id="methods-dropdown" data-bs-toggle="dropdown"
                                                        aria-expanded="false"
                                                        ref={methodsDropdownRef}
                                                        onClick={() => {methodsDropdown.toggle()}}>
                                                    {selectedMethod === null ? "Select Mint method" : selectedMethod.name}
                                                </button>
                                                <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                                    {
                                                        methods.map((m) => (
                                                            <li key={Math.random()}><a className="dropdown-item" onClick={() => {handleMethodSelect(m)} }>{m.name}</a></li>
                                                        ))
                                                    }
                                                </ul>
                                            </div>

                                            <div className="d-flex mt-3 w-100">
                                                <input type="text" className="form-control w-100" onChange={(e) => {setFunctionName(e.target.value)}} placeholder="Function name" value={functionName}/>
                                            </div>
                                        </div>


                                        {
                                            inputs.length > 0 ?
                                                <div>
                                                    <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Arguments</label>
                                                    <div className="d-flex flex-wrap">
                                                        {
                                                            inputs.map((input, index) => (
                                                                <div key={index} className="m-1">
                                                                    <input type="text" className="form-control" onChange={(e) => { handleInput(e, index) } } placeholder={input.name} value={input.value || ''}/>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>

                                                </div>
                                                :
                                                ''
                                        }
                                    </div>
                                    :
                                    ''
                            }

                            <div className={`d-flex flex-column mint-forms mt-3 m-1 ${readMethods.length > 0 ? mode === 'AUTOMATIC' ? '' : 'd-none' : 'd-none'}`}>

                                <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Automatic Detection</label>

                                <div className="d-flex w-100">
                                    <div className="dropdown w-25 mt-3 me-3">
                                        <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                                id="methods-dropdown" data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                ref={readMethodsDropdownRef}
                                                onClick={() => {readDropdown.toggle()}}>
                                            {selectedReadMethod === null ? "Select Read method" : selectedReadMethod.name}
                                        </button>
                                        <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                            {
                                                readMethods.map((m) => (
                                                    <li key={Math.random()}><a className="dropdown-item" onClick={() => {handleReadMethodSelect(m)} }>{m.name}</a></li>
                                                ))
                                            }
                                        </ul>
                                    </div>

                                    <div className="d-flex mt-3 w-75">
                                        <input type="text" className="form-control w-100" onChange={(e) => {setReadFunctionName(e.target.value)}} placeholder="Read Function name" value={readFunctionName}/>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <input type="text" className="form-control w-25" onChange={(e) => {setReadValue(e.target.value)}} placeholder="Current value" value={readValue}/>
                                </div>

                            </div>

                            <div className={`d-flex flex-column mint-forms mt-3 m-1 ${mode === 'TIMER' ? '' : 'd-none'}`}>

                                <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Timed Start</label>

                                <div className="mt-3">
                                    <input type="text" className="form-control" onChange={(e) => {setTimer(e.target.value)}} placeholder="Timestamp" value={timer}/>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={(e) => {handleAdd(e)}}>Add Task</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="modal" ref={updateRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Update Task</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex">
                                <input type="text" className="form-control w-75 m-1" aria-describedby="private-key" onChange={(e) => {setContract(e.target.value)}} placeholder="Contract Address" value={contract}/>
                                <button type="text" className="form-control btn-add w-25 m-1" onClick={handleCheck}>Check</button>
                            </div>
                            <div className="d-flex justify-content-evenly">
                                <input type="number" className="form-control m-1" onChange={(e) => {setPrice(e.target.value)}} value={price || ''} placeholder="Price in ether"/>
                                <input type="number" min="1" className="form-control m-1" onChange={(e) => {setAmount(e.target.value)}} value={amount || ''} placeholder="Total amount"/>
                                <input type="text" className="form-control m-1" onChange={(e) => {setGas(e.target.value)}} value={gas || ''} placeholder="Max gas price"/>
                                <input type="text" className="form-control m-1" onChange={(e) => {setGasPriorityFee(e.target.value)}} value={gasPriorityFee || ''} placeholder="Gas Priority Fee"/>
                            </div>

                            <div className="d-flex">
                                <div className="dropdown w-25 m-1">
                                    <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                            id="wallets-dropdown" data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            ref={updateWalletDropdownRef}
                                            onClick={() => {updateWalletDropdown.toggle()}}>
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

                            <div className="m-1">

                                <div>
                                    <input
                                        type="radio"
                                        name="manual"
                                        value="Manual"
                                        checked={updateMode === "MANUAL"}
                                        onChange={() => {
                                            setUpdateMode("MANUAL")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Manual Mode</span>
                                </div>

                                <div>
                                    <input
                                        type="radio"
                                        name="automatic"
                                        value="Automatic"
                                        checked={updateMode === "AUTOMATIC"}
                                        onChange={() => {
                                            setUpdateMode("AUTOMATIC")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Automatic Mode</span>
                                </div>

                                <div>
                                    <input
                                        type="radio"
                                        name="timer"
                                        value="Timer"
                                        checked={updateMode === "TIMER"}
                                        onChange={() => {
                                            setUpdateMode("TIMER")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>Timer Mode</span>

                                </div>

                            </div>

                            {
                                methods.length > 0 ?
                                    <div className="d-flex flex-column mint-forms mt-3 m-1">

                                        <div className="d-flex w-100">
                                            <div className="dropdown w-50 mt-3 me-3">
                                                <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                                        id="methods-dropdown" data-bs-toggle="dropdown"
                                                        aria-expanded="false"
                                                        ref={updateMethodsDropdownRef}
                                                        onClick={() => {updateMethodsDropdown.toggle()}}>
                                                    {selectedMethod === null ? "Select Mint method" : selectedMethod.name}
                                                </button>
                                                <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                                    {
                                                        methods.map((m) => (
                                                            <li key={Math.random()}><a className="dropdown-item" onClick={() => {handleMethodSelect(m)} }>{m.name}</a></li>
                                                        ))
                                                    }
                                                </ul>
                                            </div>

                                            <div className="d-flex mt-3 w-100">
                                                <input type="text" className="form-control w-100" onChange={(e) => {setFunctionName(e.target.value)}} placeholder="Function name" value={functionName}/>
                                            </div>
                                        </div>


                                        {
                                            inputs.length > 0 ?
                                                <div>
                                                    <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Arguments</label>
                                                    <div className="d-flex flex-wrap">
                                                        {
                                                            inputs.map((input, index) => (
                                                                <div key={index} className="m-1">
                                                                    <input type="text" className="form-control" onChange={(e) => { handleInput(e, index) } } placeholder={input.name} value={input.value || ''}/>
                                                                </div>
                                                            ))
                                                        }
                                                    </div>

                                                </div>
                                                :
                                                ''
                                        }
                                    </div>
                                    :
                                    ''
                            }

                            <div className={`d-flex flex-column mint-forms mt-3 m-1 ${readMethods.length > 0 ? updateMode === 'AUTOMATIC' ? '' : 'd-none' : 'd-none'}`}>

                                <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Automatic Detection</label>

                                <div className="d-flex w-100">
                                    <div className="dropdown w-25 mt-3 me-3">
                                        <button className="btn btn-primary dropdown-toggle w-100" type="button"
                                                id="methods-dropdown" data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                ref={updateReadMethodsDropdownRef}
                                                onClick={() => {updateReadDropdown.toggle()}}>
                                            {selectedReadMethod === null ? "Select Read method" : selectedReadMethod.name}
                                        </button>
                                        <ul className="dropdown-menu" aria-labelledby="wallets-dropdown">
                                            {
                                                readMethods.map((m) => (
                                                    <li key={Math.random()}><a className="dropdown-item" onClick={() => {handleReadMethodSelect(m)} }>{m.name}</a></li>
                                                ))
                                            }
                                        </ul>
                                    </div>

                                    <div className="d-flex mt-3 w-75">
                                        <input type="text" className="form-control w-100" onChange={(e) => {setReadFunctionName(e.target.value)}} placeholder="Read Function name" value={readFunctionName}/>
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <input type="text" className="form-control w-25" onChange={(e) => {setReadValue(e.target.value)}} placeholder="Current value" value={readValue}/>
                                </div>

                            </div>

                            <div className={`d-flex flex-column mint-forms mt-3 m-1 ${updateMode === 'TIMER' ? '' : 'd-none'}`}>

                                <label className="mt-2 mb-1" style={{color: "#8a78e9"}}>Timed Start</label>

                                <div className="mt-3">
                                    <input type="text" className="form-control" onChange={(e) => {setTimer(e.target.value)}} placeholder="Timestamp" value={timer}/>
                                </div>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={(e) => {handleUpdate(e)}}>Update</button>
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

            <div className="modal" ref={taskModalRef} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Task Status</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            {
                                selectedTask !== null ?
                                    <div>
                                        {
                                            selectedTask.status.error === 1
                                                ?
                                                <div className="d-flex flex-column flex-wrap">
                                                    <span className="mb-2" style={{color: '#45d39d'}}>Success</span>
                                                    <span style={{color: 'white'}}>Tx Hash: {selectedTask.status.result.transactionHash}</span>
                                                </div>
                                                :
                                                <div className="d-flex flex-column flex-wrap">
                                                    <span className="mb-2" style={{color: '#F47960'}}>Error</span>
                                                    <span style={{color: 'white'}}>{selectedTask.status.result.message}</span>
                                                </div>
                                        }

                                    </div>

                                    :
                                    ''
                            }
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Close</button>
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

export default Tasks;