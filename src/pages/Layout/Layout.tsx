import { Outlet } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import { SidebarProvider, useSidebar } from "../../contexts/SidebarContext";
import "./Layout.css";

const MainContent = () => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();

  return (
    <main className="main-content mt-0 position-relative">
      <BackgroundSection />
      <div className="main-content align-items-start min-vh-30 border-radius-lg">
        <div
          className={`layout g-sidenav-show ${
            isSidebarOpen ? "sidebar-open" : "sidebar-closed"
          }`}
        >
          <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
          <ContentArea />
        </div>
      </div>
    </main>
  );
};

const BackgroundSection = () => (
  <section className="background-layout position-absolute center " />
);

const ContentArea = () => (
  <div className="main-content position-relative border-radius-lg">
    <div
      className="content outlet-container
      position-relative
     p-1 pt-2 p-md-3 pt-md-5
     content-card-body"
    >
      <Outlet />
    </div>
  </div>
);

const Layout = () => (
  <SidebarProvider>
    <MainContent />
  </SidebarProvider>
);

export default Layout;

