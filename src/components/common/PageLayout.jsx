import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaHome, FaBars } from "react-icons/fa";
import Sidebar from "../Sidebar/Sidebar"; // Assuming this is the correct path
import "./PageLayout.css";

const PageLayout = ({ children, pageTitle }) => {
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="page-layout">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content-wrapper">
        <div className="layout-navbar">
          <button className="hamburger-menu" onClick={() => setSidebarOpen(true)}>
            <FaBars />
          </button>
          <div className="breadcrumb">
            <span className="layout-navbar-home" onClick={() => navigate("/")}>
              <FaHome />
            </span>
            <span className="layout-navbar-separator">/</span>
            <span className="layout-navbar-title">{pageTitle}</span>
          </div>
        </div>
        <main className="layout-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageLayout;
