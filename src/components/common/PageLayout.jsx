import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaHome } from "react-icons/fa";
import "./PageLayout.css";

const PageLayout = ({ children, pageTitle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="layout-bg">
      <div className="layout-container">
        {/* Sidebar should be rendered outside or as a prop if needed */}
        <div className="layout-main-card">
          <div className="layout-navbar">
            <span className="layout-navbar-home" onClick={() => navigate("/")}> <FaHome /> </span>
            <span className="layout-navbar-separator">/</span>
            <span className="layout-navbar-title">{pageTitle}</span>
          </div>
          <div className="layout-content">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLayout;
