import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar/Sidebar";
import Home from "./pages/Home/Home";
import Menu from "./pages/Inventory/Menu/Menu";
import AddProduct from "./pages/Inventory/AddProducts/AddProduct";
import EditProduct from "./pages/Inventory/EditProducts/EditProduct";
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
            <Route path="/productos" element={<Menu />} />
            <Route path="/productos/agregar" element={<AddProduct />} />
            <Route path="/productos/editar" element={<EditProduct />} />
            <Route path="/reportes" element={<Reports />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
