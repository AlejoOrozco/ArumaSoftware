import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Menu from "./pages/Inventory/Menu/Menu";
import AddProduct from "./pages/Inventory/AddProducts/AddProduct";
import EditProduct from "./pages/Inventory/EditProducts/EditProduct";
import AllProducts from "./pages/Inventory/AllProducts/AllProducts";
import Invoice from "./pages/Invoice/Invoice";
import CloseDay from "./pages/CloseDay/CloseDay";
import "./App.css"; // For global styles and background

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/inventario" element={<Menu />} />
      <Route path="/inventario/agregar" element={<AddProduct />} />
      <Route path="/inventario/editar" element={<EditProduct />} />
      <Route path="/inventario/todos" element={<AllProducts />} />
      <Route path="/factura" element={<Invoice />} />
      <Route path="/cerrar-dia" element={<CloseDay />} />
    </Routes>
  );
}

export default App;
