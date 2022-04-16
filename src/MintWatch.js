import {useEffect, useRef, useState} from "react";
import {Toast} from "bootstrap";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function MintWatch() {

    const [mints, setMints] = useState([]);

    const toastRef = useRef();
    const [toast, setToast] = useState([]);
    const [toastValue, setToastValue] = useState({});

    const startWatch = () => {
        const output = ipcRenderer.sendSync('start-mint-watch');

        if(output.error === 1) {
            setToastValue({
                message: "Mint Watch is already active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setToastValue({
            message: "Started Mint Watch.",
            color: "#73d9b0"
        });
        toast.show();

    }

    const stopWatch = () => {
        const output = ipcRenderer.sendSync('stop-mint-watch');

        if(output.error === 1) {
            setToastValue({
                message: "Mint Watch is not active.",
                color: "#d97873"
            });
            toast.show();
            return;
        }

        setToastValue({
            message: "Stopped Mint Watch.",
            color: "#73d9b0"
        });
        toast.show();

    }

    useEffect(() => {

        const data = ipcRenderer.sendSync('mint-logs');

        setMints(data.logs);

        const mint_updater = (event, data) => {
            setMints(data);
        }

        ipcRenderer.on('mint-watch', mint_updater);

        const toast = new Toast(toastRef.current, {autohide: true});
        setToast(toast);

        return () => {
            ipcRenderer.removeListener('mint-watch', mint_updater);
        }

    }, [])

    return (
        <div className="mint-logs-wrapper p-3 h-100" style={{overflowY: 'auto', overflowX: 'hidden'}}>


            <div className={"w-50"}>
                <h3 style={{fontWeight: "bold", color: "white"}}>Mint Watch</h3>
                <div className={"d-flex align-items-center tasks-actionbar rounded-3 p-3"}>
                    <div className={"start-watch m-2 d-flex align-items-center rounded-3 py-2 px-3"} onClick={() => {startWatch()}}>
                        <i className="fa-solid fa-play me-2 fa-1x" style={{color: "white"}}></i>
                        Start Watch
                    </div>

                    <div className={"stop-watch m-2 d-flex align-items-center rounded-3 py-2 px-3"} onClick={() => {stopWatch()}}>
                        <i className="fa-solid fa-stop me-2 fa-1x" style={{color: "white"}}></i>
                        Stop Watch
                    </div>
                </div>
            </div>

            <div className="mint-logs mt-3">
                { (typeof mints !== 'undefined') && mints.length > 0
                    ?
                    <div className="row log-item-header d-flex p-3">
                        <div className="col-3">
                            <span>NFT Name</span>
                        </div>
                        <div className="col-6">
                            <span>Contract Address</span>
                        </div>
                        <div className="col-3">
                            <span>Price</span>
                        </div>
                    </div>
                    :
                    ''
                }
                {
                    (typeof mints !== 'undefined') && mints.length > 0 ?
                        mints.map((m, index) => (
                            <div key={index} className="row log-item d-flex justify-content-between p-3">
                                <div className="col-3">
                                    <span>{m.name}</span>
                                </div>
                                <div className="col-6">
                                    <span>{m.contract_address}</span>
                                </div>
                                <div className="col-3">
                                    <span>{m.value}</span>
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

export default MintWatch;