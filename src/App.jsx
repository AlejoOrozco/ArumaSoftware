import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Menu from "./pages/Inventory/Menu/Menu";
import AddProduct from "./pages/Inventory/AddProducts/AddProduct";
import Resupply from "./pages/Inventory/Resupply/Resupply";
import AllProducts from "./pages/Inventory/AllProducts/AllProducts";
import Discounts from "./pages/Inventory/Discounts/Discounts";
import Invoice from "./pages/Invoice/Invoice";
import CloseDay from "./pages/CloseDay/CloseDay";
import "./App.css"; // For global styles and background

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/inventario" element={<Menu />} />
      <Route path="/inventario/agregar" element={<AddProduct />} />
      <Route path="/inventario/reabastecer" element={<Resupply />} />
      <Route path="/inventario/todos" element={<AllProducts />} />
      <Route path="/inventario/descuentos" element={<Discounts />} />
      <Route path="/factura" element={<Invoice />} />
      <Route path="/cerrar-dia" element={<CloseDay />} />
    </Routes>
  );
}

export default App;
