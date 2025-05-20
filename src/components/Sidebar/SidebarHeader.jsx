import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { useCompany, COMPANIES } from "../../contexts/CompanyContext";

const SidebarHeader = ({ onCloseButtonClick }) => {
  const { selectedCompany, selectCompany } = useCompany();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCompanySelect = (company) => {
    selectCompany(company);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <div className="sidenav-header w-100" ref={dropdownRef}>
      <div
        className="navbar-brand me-0 justify-content-start d-flex align-items-center cursor-pointer"
        onClick={toggleDropdown}
      >
        <div className="icon p-0 icon-shape text-center me-1 d-flex align-items-center">
          <i
            className={`bi bi-chevron-${
              isDropdownOpen ? "down" : "right"
            } fs-6 opacity-10 icon-sidebar top-2`}
          ></i>
        </div>
        <img
          src={selectedCompany.logo}
          alt={selectedCompany.name}
          className="company-logo me-2 w-100 d-flex justify-content-center"
          style={{ maxWidth: "152px" }}
        />
      </div>

      <button
        className="btn btn-link text-secondary close-btn d-xl-none"
        onClick={onCloseButtonClick}
      >
        <i className="bi bi-x-square-fill"></i>
      </button>

      <div
        className={`company-dropdown transition-max-height ${
          isDropdownOpen ? "open" : "closed"
        }`}
      >
        <ul className="navbar-nav justify-content-center">
          {Object.values(COMPANIES).map((company) => (
            <li
              key={company.id}
              className={`nav-item p-0 justify-content-center d-flex w-auto ${
                selectedCompany.id === company.id ? "active" : ""
              }`}
              onClick={() => handleCompanySelect(company)}
            >
              <div className="nav-link m-0 align-items-center d-flex cursor-pointer my-2 justify-content-center">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="company-logo-small"
                  style={{ height: "25px" }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

SidebarHeader.propTypes = {
  onCloseButtonClick: PropTypes.func.isRequired,
};

export default SidebarHeader;
