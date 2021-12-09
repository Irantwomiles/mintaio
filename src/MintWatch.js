import {useEffect, useState} from "react";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function MintWatch() {

    const [mints, setMints] = useState([]);

    useEffect(() => {

        const mint_updater = (event, data) => {
            setMints([...mints, data]);
        }

        ipcRenderer.on('mint-watch', mint_updater);

        return () => {
            ipcRenderer.removeListener('mint-watch', mint_updater);
        }

    }, [])

    return (
        <div className="p-3" style={{overflowY: 'auto', overflowX: 'hidden'}}>
            {
                mints.length > 0 ?
                    mints.map((m) => (
                        <div key={Math.random()} className="d-flex justify-content-between">
                            <div>
                                <span>{m.name}</span>
                            </div>
                            <div>
                                <span>{m.contract_address}</span>
                            </div>
                            <div>
                                <span>{m.value}</span>
                            </div>
                        </div>
                        ))
                    :
                    ''
            }
        </div>
    )
}

export default MintWatch;