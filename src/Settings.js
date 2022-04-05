import {useState, useEffect} from 'react';
import './style.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

function Settings() {

    const [primary, setPrimary] = useState("");
    const [secondary, setSecondary] = useState("");
    const [webhook, setWebhook] = useState("");

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

    const changeWebhook = () => {

        if(webhook.length === 0) return;

        ipcRenderer.sendSync("set-task-webhook", webhook);

        //send toast on success

    }

    useEffect(() => {

        const update_keys = () => {
            const output = ipcRenderer.sendSync('get-alchemy-keys');
            setPrimary(output.keys.primary_key);
            setSecondary(output.keys.secondary_key);
        }

        const update_webhook = () => {
            const output = ipcRenderer.sendSync('get-webhook');
            setWebhook(output);
        }

        update_keys();
        update_webhook();

    }, [])

    return (
        <div className="settings-wrapper p-3 h-100">

            <h3 style={{fontWeight: "bold", color: "white"}}>Settings</h3>

            <div className="settings p-3 mt-3 rounded">

                <div className="d-flex align-items-end m-3">
                    <div className="w-75">
                        <p className="title mb-2">Alchemy Primary Key</p>
                        <input type="text" className="form-control" onChange={(e) => {setPrimary(e.target.value)}} placeholder="Primary API Key" value={primary} />
                    </div>
                    <div>
                        <button className="btn btn-add ms-2" onClick={() => {changePrimary()}}>Update</button>
                    </div>
                </div>

                <div className="d-flex align-items-end m-3">
                    <div className="w-75">
                        <p className="title mb-2">Alchemy Secondary Key</p>
                        <input type="text" className="form-control" onChange={(e) => {setSecondary(e.target.value)}} placeholder="Secondary API Key" value={secondary} />
                    </div>
                    <div>
                        <button className="btn btn-add ms-2" onClick={() => {changeSecondary()}}>Update</button>
                    </div>
                </div>

                <div className="d-flex align-items-end m-3">
                    <div className="w-75">
                        <p className="title mb-2">Discord Webhook</p>
                        <input type="text" className="form-control" onChange={(e) => {setWebhook(e.target.value)}} placeholder="Discord Webhook" value={webhook} />
                    </div>
                    <div>
                        <button className="btn btn-add ms-2" onClick={() => {changeWebhook()}}>Update</button>
                    </div>
                </div>

                <div className="m-3 mt-4">
                    <p className={"title"}>What are these three options?</p>
                    <p style={{color: "white"}}>
                        The first two settings are for you to setup your own Alchemy API keys. This options helps users avoid rate limiting when many MintAIO users are running the program at the same time. If you would like to setup your own keys please watch the ending of the video linked below which explains how this can be done. If you have any other questions you can follow us on Twitter and join our Discord server. The last one setting allows you to set your own Discord Webhook to send messages directly to your server.
                    </p>
                </div>

                <div className={"d-flex ms-3"}>
                    <div className="d-flex align-items-center">
                        <i style={{color: "#45d39d"}} className="fab fa-youtube fa-2x me-3"></i>
                        <span className="settings-url" onClick={() => {electron.shell.openExternal(`https://www.youtube.com/watch?v=hTukLhIjkbM`);}}></span>
                    </div>
                    <div className="d-flex align-items-center">
                        <i style={{color: "#45d39d"}} className="fas fa-info-circle fa-2x me-3"></i>
                        <span className="settings-url" onClick={() => {electron.shell.openExternal(`https://mintaio.gitbook.io/mintaio-wiki/`);}}></span>
                    </div>
                    <div className="d-flex align-items-center">
                        <i style={{color: "#45d39d"}} className="fab fa-twitter fa-2x me-3"></i>
                        <span className="settings-url" onClick={() => {electron.shell.openExternal(`https://twitter.com/MintAIO_`);}}></span>
                    </div>
                    <div className="d-flex align-items-center">
                        <i style={{color: "#45d39d"}} className="fab fa-discord fa-2x me-3"></i>
                        <span className="settings-url" onClick={() => {electron.shell.openExternal(`https://discord.gg/xX3SQfhk4D`);}}></span>
                    </div>
                </div>

            </div>

        </div>
    )
}

export default Settings;