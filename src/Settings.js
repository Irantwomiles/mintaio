import {useState, useRef, useEffect, useContext} from 'react';
import {Modal, Toast} from "bootstrap";
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Settings() {

    const [primary, setPrimary] = useState("");
    const [secondary, setSecondary] = useState("");

    const changePrimary = () => {

        if(primary.length === 0) return;

        ipcRenderer.sendSync("update-alchemy-key-primary", primary);

        //send toast on success
    }

    const changeSecondary = () => {

        if(secondary.length === 0) return;

        ipcRenderer.sendSync("update-alchemy-key-secondary", secondary);

        //send toast on success

    }

    return (
        <div className="settings-wrapper p-3 h-100">

            <div className="settings">

                <div className="d-flex align-items-end m-3">
                    <div className="w-75">
                        <p className="mb-2">Primary Key</p>
                        <input type="text" className="form-control" onChange={(e) => {setPrimary(e.target.value)}} placeholder="Primary API Key" value={primary} />
                    </div>
                    <div>
                        <button className="btn btn-update ms-2" onClick={() => {changePrimary()}}>Update</button>
                    </div>
                </div>

                <div className="d-flex align-items-end m-3">
                    <div className="w-75">
                        <p className="mb-2">Secondary Key</p>
                        <input type="text" className="form-control" onChange={(e) => {setSecondary(e.target.value)}} placeholder="Secondary API Key" value={secondary} />
                    </div>
                    <div>
                        <button className="btn btn-update ms-2" onClick={() => {changeSecondary()}}>Update</button>
                    </div>
                </div>

            </div>

        </div>
    )
}

export default Settings;