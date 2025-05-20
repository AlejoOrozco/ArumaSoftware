import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory/Inventory";
import Reports from "./pages/Reports/Reports";
import "./App.css"; // For global styles and background

function App() {
  return (
    <div className="app-bg">
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/productos" element={<Inventory />} />
            <Route path="/reportes" element={<Reports />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
