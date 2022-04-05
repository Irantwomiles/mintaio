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

    const globalRef = useRef();

    const [toast, setToast] = useState([]);
    const [modal, setModal] = useState([]);
    const [taskModal, setTaskModal] = useState([]);
    const [unlockModal, setUnlockModal] = useState([]);
    const [walletDropdown, setWalletDropdown] = useState([]);
    const [methodsDropdown, setMethodsDropdown] = useState([]);

    const [toastValue, setToastValue] = useState({});
    const [readDropdown, setReadDropdown] = useState([]);
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
    }

    const handleUpdate = (e) => {
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

        setModal(new Modal(globalRef.current.querySelector('#task-modal'), {keyboard: false}));
        setTaskModal(new Modal(globalRef.current.querySelector('#status-modal'), {keyboard: false}));
        setUnlockModal(new Modal(globalRef.current.querySelector('#unlock-wallet-modal'), {keyboard: false}));

        setWalletDropdown(new Dropdown(globalRef.current.querySelector('#wallets-dropdown'), {}));

        setToast(new Toast(globalRef.current.querySelector('#toast'), {autohide: true}));

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
            setMethodsDropdown(new Dropdown(globalRef.current.querySelector('#methods-dropdown'), {keyboard: false}));
        }
    }, [methods]);

    useEffect(() => {
        if(readMethods.length > 0) {
            setReadDropdown(new Dropdown(globalRef.current.querySelector('#read-methods-dropdown'), {keyboard: false}));
        }
    }, [readMethods]);

    return (
        <div ref={globalRef} className="tasks-wrapper py-3 px-4 h-100">

            <div className={"w-50"}>
                <h3 style={{fontWeight: "bold", color: "white"}}>Tasks</h3>
                <div className={"d-flex justify-content-center align-items-center tasks-actionbar rounded-3 p-3"}>
                    <div className={"new-task m-2 d-flex align-items-center rounded-3 p-2"} onClick={() => {modal.show()}}>
                        <i className="fa-solid fa-plus fa-1x m-1" style={{color: "white"}}></i>
                    </div>

                    <div className={"start-all-task m-2 d-flex align-items-center rounded-3 py-2 px-3"} onClick={() => {handleStartAll()}}>
                        <i className="fa-solid fa-play me-2 fa-1x" style={{color: "white"}}></i>
                        Start All
                    </div>

                    <div className={"stop-all-task m-2 d-flex align-items-center rounded-3 py-2 px-3"} onClick={() => {handleStopAll()}}>
                        <i className="fa-solid fa-stop me-2 fa-1x" style={{color: "white"}}></i>
                        Stop All
                    </div>

                    <div className={"delete-all-task m-2 d-flex align-items-center rounded-3 p-2"} onClick={() => {handleDeleteAll()}}>
                        <i className="fa-solid fa-trash-can fa-1x m-1" style={{color: "white"}}></i>
                    </div>
                </div>
            </div>

            <div className="tasks-list mt-3">

                {
                    // tasks.length > 0 ?
                    //     <div className="row d-flex p-3">
                    //         <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Wallet</span></div>
                    //         <div className="col-6 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Project</span></div>
                    //         <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Status</span></div>
                    //         <div className="col-2 tasks-header pb-2" style={{textAlign: 'center'}}><span style={{color: 'white'}}>Actions</span></div>
                    //     </div>
                    //     :
                    //     ''

                    <div className="row tasks-header d-flex p-3">
                        <div className="col-2 tasks-header-item pb-3" style={{textAlign: 'center'}}><span>Wallet</span></div>
                        <div className="col-6 tasks-header-item pb-3" style={{textAlign: 'center'}}><span>Project</span></div>
                        <div className="col-2 tasks-header-item pb-3" style={{textAlign: 'center'}}><span>Status</span></div>
                        <div className="col-2 tasks-header-item pb-3" style={{textAlign: 'center'}}><span>Actions</span></div>
                    </div>
                }

                {
                    tasks.length > 0 ?

                        tasks.map((task) => (
                            <div key={Math.random()} className="row d-flex task p-3">
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
                                    <span onClick={() => {handleTaskModal(task)}}>
                                        {getTaskStatus(task)}
                                    </span>
                                </div>
                                <div className="col-2" style={{color: 'white', textAlign: 'center'}}>
                                    <span className="ms-1 me-1 start-btn" onClick={(e) => {handleStart(e, task.id)}}><i className="fa-solid fa-play"></i></span>
                                    <span className="ms-1 me-1 stop-btn" onClick={(e) => {handleStop(e, task.id)}}><i className="fa-solid fa-stop"></i></span>
                                    <span className={"ms-1 me-1 edit-btn"} onClick={(e) =>{handleEdit(task)}}><i className="fas fa-pencil-alt"></i></span>
                                    <span className="ms-1 me-1 delete-btn" onClick={(e) =>{handleDelete(e, task.id)}}><i className="fas fa-trash-alt"></i></span>
                                </div>
                            </div>
                        ))
                        :
                        <div className="d-flex justify-content-center align-items-center w-100 h-100 mt-5">
                            <h3 style={{color: "white"}}>You don't have any tasks setup yet.</h3>
                        </div>
                }

            </div>

            <div className="modal" id={"task-modal"} tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">New Task</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex pb-2">
                                <div className={"w-75 me-2"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Contract Address</label>
                                    <input type="text" className="form-control" aria-describedby="private-key" onChange={(e) => {setContract(e.target.value)}} placeholder="Contract Address" value={contract}/>
                                </div>

                                <button type="text" className="form-control btn btn-add w-25 mt-auto" onClick={handleCheck}>Check</button>
                            </div>

                            <div className={"pb-2"}>
                                <label className={"mb-1"} style={{color: "white"}}>ABI Manual Entry</label>
                                <textarea className={"w-100"} onChange={(e) => {setAbi(e.target.value)}} value={abi} />
                            </div>

                            <hr />

                            <div className="d-flex justify-content-evenly pb-2 w-50">
                                <div className={"me-2"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Price</label>
                                    <input type="number" className="form-control" onChange={(e) => {setPrice(e.target.value)}} value={price || ''} placeholder="Price in ether"/>
                                </div>

                                <div className={"me-2"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Amount</label>
                                    <input type="number" min="1" className="form-control" onChange={(e) => {setAmount(e.target.value)}} value={amount || ''} placeholder="Total amount"/>
                                </div>
                            </div>

                            <hr />

                            <div className="d-flex pb-2">

                                <div className={"me-2"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Max Gas Price</label>
                                    <input type="text" className="form-control" onChange={(e) => {setGas(e.target.value)}} value={gas || ''} placeholder="Max gas price"/>
                                </div>

                                <div className={"me-2"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Priority Gas Fee</label>
                                    <input type="text" className="form-control" onChange={(e) => {setGasPriorityFee(e.target.value)}} value={gasPriorityFee || ''} placeholder="Gas Priority Fee"/>
                                </div>

                                <div>
                                    <label className={"mb-1"} style={{color: "white"}}>Gas Limit</label>
                                    <input type="number" className="form-control" onChange={(e) => {setGasLimit(e.target.value)}} placeholder="Gas Limit" value={gasLimit}/>
                                </div>

                            </div>

                            <hr />

                            <div className="d-flex pb-2">
                                <div className="dropdown w-25 me-2">
                                    <button className="btn btn-add dropdown-toggle w-100"
                                            type="button"
                                            id="wallets-dropdown"
                                            data-bs-toggle="dropdown"
                                            aria-expanded="false"
                                            onClick={() => {walletDropdown.show()}}>
                                        {selectedWallet === null ? "Select a wallet" : selectedWallet.name}
                                    </button>
                                    <ul className="dropdown-menu mt-1" aria-labelledby="wallets-dropdown">
                                        {
                                            wallet.map((w) => (
                                                <li key={w.id}><a className="dropdown-item" onClick={() => {setSelectedWallet(w)} }>{w.name.length > 0 ? w.name + " | " : ""}0x{w.encrypted.address}</a></li>
                                            ))
                                        }
                                    </ul>
                                </div>
                                <input type="password" className="form-control w-75" onChange={(e) => {setWalletPassword(e.target.value)}} placeholder="Password" value={walletPassword}/>
                            </div>

                            <hr />

                            <div className="pb-2 d-flex justify-content-between">

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

                                <div>
                                    <input
                                        type="radio"
                                        name="first-block"
                                        value="First Block"
                                        checked={mode === "FIRST_BLOCK"}
                                        onChange={() => {
                                            setMode("FIRST_BLOCK")
                                        }}
                                    />
                                    <span className="ms-2" style={{color: "white"}}>First Block (coming soon)</span>
                                </div>

                            </div>

                            {
                                methods.length > 0 ?
                                    <div className="d-flex flex-column mint-forms mt-3">

                                        <div className="d-flex w-100">
                                            <div className="dropdown w-50 mt-3 me-2">
                                                <button className="btn btn-add dropdown-toggle w-100" type="button"
                                                        id="methods-dropdown"
                                                        data-bs-toggle="dropdown"
                                                        aria-expanded="false"
                                                        onClick={() => {methodsDropdown.toggle()}}>
                                                    {selectedMethod === null ? "Select Mint method" : selectedMethod.name}
                                                </button>
                                                <ul className="dropdown-menu" aria-labelledby="methods-dropdown">
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
                                                    <label className="mt-2 mb-1" style={{color: "white"}}>Arguments</label>
                                                    <div className="d-flex flex-wrap">
                                                        {
                                                            inputs.map((input, index) => (
                                                                <div key={index}>
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

                            <div className={`d-flex pb-2 ${mode === 'FIRST_BLOCK' ? '' : 'd-none'}`}>
                                <div className={"w-100"}>
                                    <label className={"mb-1"} style={{color: "white"}}>Contract Creator</label>
                                    <input type="text" className="form-control" onChange={(e) => {setContractCreator(e.target.value)}} placeholder="Contract Address" value={contractCreator}/>
                                </div>
                            </div>

                            <div className={`d-flex flex-column mt-3 m-1 ${readMethods.length > 0 ? mode === 'AUTOMATIC' ? '' : 'd-none' : 'd-none'}`}>

                                <label className="mt-2 mb-1" style={{color: "white"}}>Automatic Detection</label>

                                <div className="d-flex w-100">
                                    <div className="dropdown w-25 mt-3 me-3">
                                        <button className="btn btn-add dropdown-toggle w-100" type="button"
                                                id="read-methods-dropdown"
                                                data-bs-toggle="dropdown"
                                                aria-expanded="false"
                                                onClick={() => {readDropdown.toggle()}}
                                        >
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

                                <label className="mt-2 mb-1" style={{color: "white"}}>Timed Start</label>

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

            <div className="modal" id={"unlock-wallet-modal"} tabIndex="-1">
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

            <div className="modal" id={"status-modal"} tabIndex="-1">
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

            <div className="toast position-fixed bottom-0 end-0 m-4" id={"toast"} role="alert" aria-live="assertive" aria-atomic="true" style={{borderColor: `${toastValue.color}`}}>
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