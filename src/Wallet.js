import {useState, useRef, useEffect, useContext} from 'react';
import { WalletContext } from "./state/WalletContext";
import {Modal, Toast} from "bootstrap";
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Wallet() {

    const [wallet, setWallet] = useContext(WalletContext);

    const modalRef = useRef();
    const toastRef = useRef();

    const [modal, setModal] = useState([]);
    const [toast, setToast] = useState([]);

    const [toastValue, setToastValue] = useState({});
    const [privateKey, setPrivateKey] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [name, setName] = useState("");
    const [balance, setBalance] = useState("");

    const addWallet = () => {

        if(privateKey.length === 0) {
            setToastValue({
                message: "Invalid private key.",
                color: "#d97873"}
            );
            modal.hide();
            toast.show();
            return;
        }

        // 0xd6db524d79bb18c27d65baecf8586334746cbc23aa80da92681c46f52ad7b1d2 //test account private_key (theres nothing on here)

        if(password.length <= 5) {
            setToastValue({
                message: "Password must be at least 5 characters.",
                color: "#d97873"}
            );
            modal.hide();
            toast.show();
            return;
        }

        if(password !== confirmPassword) {
            setToastValue({
                message: "Passwords must match.",
                color: "#d97873"}
            );
            modal.hide();
            toast.show();
            return;
        }

        const value = ipcRenderer.sendSync('add-wallet', {
            private_key: privateKey,
            password: password,
            name: name
        })

        if(value.error === 1) {
            setToastValue({
                message: "Invalid private key.",
                color: "#d97873"}
            );
            modal.hide();
            toast.show();
            return;
        } //send toast

        if(value.error === 2) {
            setToastValue({
                message: "This wallet address has already been added.",
                color: "#d97873"}
            );
            modal.hide();
            toast.show();
            return;
        }

        setWallet([...wallet, value.wallet]);
        modal.hide();

        setToastValue({
            message: "Successfully added a new wallet.",
            color: "#73d9b0"}
        );

        toast.show();
        return;
    }

    const deleteWallet = (address) => {
        const value = ipcRenderer.sendSync('delete-wallet', address);

        if(value.error === 1) {
            setToastValue({
                message: "Could not find that wallet.",
                color: "#d97873"}
            );
            toast.show();
            return;
        }

        setWallet(value.wallets);

        setToastValue({
            message: "Deleted wallet successfully.",
            color: "#73d9b0"}
        );

        toast.show();
        return;
    }

    const handleBalanceRefresh = () => {
        const output = ipcRenderer.sendSync('refresh-balance', wallet);

        setBalance(output.balance);
    }

    useEffect(() => {

        const modal = new Modal(modalRef.current, {keyboard: false});
        setModal(modal);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

    }, []);

    useEffect(() => {

        handleBalanceRefresh();

    }, [wallet])

    return (
        <div className="wallet-wrapper p-3 h-100">

            <div className="wallet-toolbar d-flex align-items-center justify-content-between">
                <div className="add-wallet m-1" onClick={() => {modal.show()}}>
                    <span><i className="fas fa-plus-circle"></i></span>
                    <span className="ms-2">Add Wallet</span>
                </div>
                <div className="wallet-balance m-1">
                    <span className="me-3 wallet-balance-text">Total balance: <span style={{color: 'white'}}>{Number.parseFloat(balance)}</span> Ξ</span>
                    <span className="refresh-wallet" onClick={() => {handleBalanceRefresh()}}><i className="fas fa-sync-alt"></i></span>
                </div>
            </div>

            <div className="wallet-list mt-3">

                {
                    wallet.length > 0
                        ?
                        <div className="row wallet-item d-flex p-3">
                            <div className="col-3 wallet-name wallet-header pb-2">
                                <span>Wallet Name</span>
                            </div>
                            <div className="col-6 wallet-address wallet-header pb-2">
                                <span>Public Address</span>
                            </div>
                            <div className="col-3 wallet-action wallet-header pb-2">
                                <span>Actions</span>
                            </div>
                        </div>
                        :
                        ''
                }

                {

                    wallet.length > 0
                        ?
                    wallet.map((w) => (
                        <div key={w.id} className="row wallet-item d-flex p-3">
                            <div className="col-3 wallet-name">
                                <span className="wallet-name-text">{w.name}</span>
                            </div>
                            <div className="col-6 wallet-address">
                                <span>0x{w.encrypted.address}</span>
                            </div>
                            <div className="col-3 wallet-action">
                                <span className="ms-1 me-1 copy-wallet"><i className="fas fa-copy"></i></span>
                                <span className="ms-1 me-1 toggle-wallet"><i className="fas fa-eye"></i></span>
                                <span className="ms-1 me-1 delete-wallet" onClick={() => {deleteWallet(w.id)}}><i className="fas fa-trash-alt"></i></span>
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
                            <h5 className="modal-title">Add Wallet</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <div className="d-flex">
                                <input type="text" className="form-control w-75 m-1" aria-describedby="private-key" onChange={(e) => setPrivateKey(e.target.value)} value={privateKey} placeholder="Private key"/>
                                <input type="text" className="form-control w-25 m-1" onChange={(e) => setName(e.target.value)} value={name} placeholder="Wallet name" />

                            </div>
                            <div className="d-flex">
                                <input type="text" className="form-control m-1" onChange={(e) => setPassword(e.target.value)} value={password} placeholder="Password" />
                                <input type="text" className="form-control m-1" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword} aria-describedby="wallet-confirm-password" placeholder="Confirm password"/>
                            </div>

                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={addWallet}>Add wallet</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="toast position-fixed bottom-0 end-0 m-3" ref={toastRef} role="alert" aria-live="assertive" aria-atomic="true" style={{borderColor: `${toastValue.color}`}}>
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

export default Wallet;