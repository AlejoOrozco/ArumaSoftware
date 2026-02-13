type SidebarHeaderProps = {
  onCloseButtonClick: () => void;
};

const SidebarHeader = ({ onCloseButtonClick }: SidebarHeaderProps) => (
  <div className="sidenav-header w-100">
    <div className="navbar-brand me-0 justify-content-start d-flex align-items-center">
      <span className="sidebar-logo-text">Aruma Café</span>
    </div>

    <button
      className="btn btn-link text-secondary close-btn d-xl-none"
      onClick={onCloseButtonClick}
    >
      <i className="bi bi-x-square-fill"></i>
    </button>
  </div>
);

export default SidebarHeader;
