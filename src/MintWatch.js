import {useEffect, useState} from "react";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function MintWatch() {

    const [mints, setMints] = useState([]);

    useEffect(() => {

        const past_logs = ipcRenderer.sendSync('mint-logs');

        setMints(past_logs);

        const mint_updater = (event, data) => {
            setMints(data);
        }

        ipcRenderer.on('mint-watch', mint_updater);

        return () => {
            ipcRenderer.removeListener('mint-watch', mint_updater);
        }

    }, [])

    return (
        <div className="mint-logs-wrapper p-3 h-100" style={{overflowY: 'auto', overflowX: 'hidden'}}>
            <div className="mint-logs">
                { mints.length > 0
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
                    mints.length > 0 ?
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
                        ))
                        :
                        ''
                }
            </div>
        </div>
    )
}

export default MintWatch;