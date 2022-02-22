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
            {/*<div className="d-flex justify-content-center">*/}
            {/*    <h4 style={{color: "#F47960"}}>Currently Disabled<i className="fas fa-exclamation-circle ms-2"></i></h4>*/}
            {/*</div>*/}

            <div className={"d-flex"}>
                <div className="start-watch m-1 me-4" onClick={() => {startWatch()}}>
                    <span><i className="fas fa-play-circle"></i></span>
                    <span className="ms-2">Start Watch</span>
                </div>
                <div className="stop-watch m-1 me-4" onClick={() => {stopWatch()}}>
                    <span><i className="fas fa-stop-circle"></i></span>
                    <span className="ms-2">Stop Watch</span>
                </div>
            </div>

            <div className="mint-logs mt-3">
                { (typeof mints !== 'undefined') && mints.length > 0
                    ?
                    <div className="row log-item-header log-item d-flex p-3">
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