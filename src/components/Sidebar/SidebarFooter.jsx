import "./SidebarFooter.css";

const SidebarFooter = () => {
  return (
    <div className=" mt-3 ">
      <div className="sidebar-footer">
        {/* <div className="help-section">
          <div className="help-text">
            <p className="text-white up mb-0">Need help?</p>
            <p className="text-xs font-weight-bold">Check out our support resources</p>
          </div>
        </div> */}

        <div className="feedback-section">
          <a
            href="https://wkf.ms/4kfSHBD"
            target="_blank"
            rel="noopener noreferrer"
            className="feedback-link"
          >
            <div className="feedback-item w-100">
              <div className="feedback-icon bg-white d-flex align-items-center justify-content-center">
                <i className="bi bi-bug-fill text-primary fs-6 opacity-10 top-2"></i>
              </div>
              <span className="text-white nav-link-text text-xs">
                Report a bug
              </span>
            </div>
          </a>

          <a
            href="https://wkf.ms/4bOSPnJ"
            target="_blank"
            rel="noopener noreferrer"
            className="feedback-link"
          >
            <div className="feedback-item w-100">
              <div className="feedback-icon bg-white  d-flex align-items-center justify-content-center">
                <i className="bi bi-chat-dots-fill  text-primary fs-6 opacity-10 top-2"></i>
              </div>
              <span className="text-white nav-link-text text-xs">
                Provide feedback
              </span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default SidebarFooter;
