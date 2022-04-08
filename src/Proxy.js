import {useEffect, useState, useRef} from "react";
import { Modal, Toast } from "bootstrap";
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Proxy() {

    const globalRef = useRef();

    const [modal, setModal] = useState([]);
    const [toast, setToast] = useState([]);

    const [proxies, setProxies] = useState([]);
    const [textArea, setTextArea] = useState([]);
    const [toastValue, setToastValue] = useState({});

    useEffect(() => {
        setModal(new Modal(globalRef.current.querySelector('#proxies-modal'), {keyboard: false}));
        setToast(new Toast(globalRef.current.querySelector('#toast'), {autohide: true}));

        const output = ipcRenderer.sendSync('load-proxies');
        setProxies(output);

        const update_proxies = () => {
            const output = ipcRenderer.sendSync('load-proxies');
            setProxies(output);
        }

        ipcRenderer.on('proxy-status', update_proxies);

        return () => {
            ipcRenderer.removeListener('proxy-status', update_proxies);
        }

    }, [])

    const loadProxies = () => {

        if(textArea.length === 0) {
            setToastValue({
                message: "No proxies inputted.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        const output = ipcRenderer.sendSync('save-proxies', textArea);

        if(output.error !== 0) {
            setToastValue({
                message: "An error occured while inputting proxies.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setProxies(output.proxies);
    }

    const deleteProxies = () => {
        const output = ipcRenderer.sendSync('delete-proxies');

        setProxies(output.proxies);
    }

    const testAll = () => {
        console.log("test-proxies clicked");
        ipcRenderer.send('test-proxies');
    }

    const getStatusColor = (status) => {
        if(status === 'Check') {
            return 'check'
        } else if(status.includes('Success')) {
            return 'success'
        } else if(status === 'Error') {
            return 'error'
        } else if(status === 'Checking') {
            return 'checking'
        }
    }

    return(
        <div ref={globalRef} className={"proxy-wrapper p-3 h-100"}>
            <div className={"w-50"}>
                <h3 style={{fontWeight: "bold", color: "white"}}>Proxies</h3>
                <div className={"d-flex justify-content-center align-items-center tasks-actionbar rounded-3 p-3"}>
                    <div className={"add-proxies m-2 d-flex align-items-center rounded-3 p-2"} onClick={() => {modal.show()}}>
                        <i className="fa-solid fa-plus fa-1x m-1" style={{color: "white"}}></i>
                    </div>

                    <div className={"check-all-proxy m-2 d-flex align-items-center rounded-3 py-2 px-3"} onClick={() => {testAll()}}>
                        <i className="fa-solid fa-play me-2 fa-1x" style={{color: "white"}}></i>
                        Test All
                    </div>

                    <div className={"delete-all-proxy m-2 d-flex align-items-center rounded-3 p-2"} onClick={() => {deleteProxies()}}>
                        <i className="fa-solid fa-trash-can fa-1x m-1" style={{color: "white"}}></i>
                    </div>
                </div>
            </div>

            <div className={"proxy-content p-3"}>
                {
                    typeof proxies !== 'undefined' && proxies.length > 0 ?
                        proxies.map((p, index) => (
                            <div key={index} className={"row proxy p-2 rounded"}>
                                <span className={"col-8"} style={{color: "white"}}>{p.host}:{p.port}:{p.user}:{p.pass}</span>
                                <span className={`col-4 ${getStatusColor(p.status)}`} style={{textAlign:"center"}}>{p.status}</span>
                            </div>
                        ))
                        :
                        <h4 className={"mt-5"} style={{color:"white", textAlign: "center"}}>No proxies found</h4>
                }
            </div>

            <div className="modal" id="proxies-modal" tabIndex="-1">
                <div className="modal-dialog modal-lg">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">Import Proxies</h5>
                            <div className="modal-close" data-bs-dismiss="modal"><i className="far fa-times-circle"></i></div>
                        </div>
                        <div className="modal-body">
                            <textarea className="form-control" id="exampleFormControlTextarea1" style={{color: "white"}} rows="6" onChange={(e) => setTextArea(e.target.value)}></textarea>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-cancel" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" className="btn btn-add" onClick={loadProxies}>Load</button>
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

export default Proxy;