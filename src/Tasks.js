import './style.scss';

function Tasks() {
    return (
        <div className="tasks-wrapper p-3 h-100">

            <div className="tasks-toolbar d-flex">
                <div className="new-task m-1" onClick={() => {}}>
                    <span><i className="fas fa-plus-circle"></i></span>
                    <span className="ms-2">New Task</span>
                </div>
            </div>

            <div className="tasks-list mt-3">

                <div className="d-flex justify-content-between">
                    <div>
                        <span style={{color: 'white'}}>Wallet 1</span>
                    </div>
                    <div>
                        <span style={{color: 'white'}}>Contract Address</span>
                    </div>
                    <div>
                        <span style={{color: 'white'}}>Status</span>
                    </div>
                    <div style={{color: 'white'}}>
                        <span className="ms-1 me-1"><i className="fas fa-copy"></i></span>
                        <span className="ms-1 me-1"><i className="fas fa-eye"></i></span>
                        <span className="ms-1 me-1"><i className="fas fa-trash-alt"></i></span>
                    </div>
                </div>

            </div>

        </div>
    )
}

export default Tasks;