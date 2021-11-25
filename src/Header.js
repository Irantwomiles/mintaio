import './style.scss';

function Header() {

    return(
        <div className="header-wrapper">
            <div className="header d-flex p-3">
                <div className="header-btn border rounded-3 pt-2 pb-2 ps-3 pe-3 m-1">
                    <i className="fas fa-wallet"></i>
                    <span className="ms-2">Wallets</span>
                </div>
                <div className="header-btn border rounded-3 pt-2 pb-2 ps-3 pe-3 m-1">
                    <i className="fas fa-list-ul"></i>
                    <span className="ms-2">Tasks</span>
                </div>
            </div>
        </div>
    );
}

export default Header;