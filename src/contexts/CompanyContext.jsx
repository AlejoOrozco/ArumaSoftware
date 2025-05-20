import { createContext, useContext, useState } from "react";
import PropTypes from "prop-types";

// Available companies
export const COMPANIES = {
  PACIFIC_WORKERS: {
    id: "pacific-workers",
    name: "Pacific Workers",
    logo: "/img/logo-pacific-workers.png",
  },
  HUSTLE_FLOW: {
    id: "hustle-and-flow",
    name: "Hustle & Flow",
    logo: "/img/logo-hustle-and-flow.png",
  },
  VIVA_GLOBAL: {
    id: "viva-global",
    name: "Viva Global",
    logo: "/img/logo-viva-global.png",
  },
};

const CompanyContext = createContext();

export const CompanyProvider = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = useState(
    COMPANIES.PACIFIC_WORKERS
  );

  const selectCompany = (company) => {
    setSelectedCompany(company);
  };

  return (
    <CompanyContext.Provider
      value={{ selectedCompany, selectCompany, companies: COMPANIES }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

CompanyProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};
