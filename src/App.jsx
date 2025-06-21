import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Menu from "./pages/Inventory/Menu/Menu";
import AddProduct from "./pages/Inventory/AddProducts/AddProduct";
import EditProduct from "./pages/Inventory/EditProducts/EditProduct";
import AllProducts from "./pages/Inventory/AllProducts/AllProducts";
import Reports from "./pages/Reports/Main/Reports";
import InvoicesReport from "./pages/Reports/Invoices/InvoicesReport";
import ProductsReport from "./pages/Reports/Products/ProductsReport";
import Invoice from "./pages/Invoice/Invoice";
import "./App.css"; // For global styles and background

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/inventario" element={<Menu />} />
      <Route path="/inventario/agregar" element={<AddProduct />} />
      <Route path="/inventario/editar" element={<EditProduct />} />
      <Route path="/inventario/todos" element={<AllProducts />} />
      <Route path="/reportes" element={<Reports />} />
      <Route path="/reportes/facturas" element={<InvoicesReport />} />
      <Route path="/reportes/productos" element={<ProductsReport />} />
      <Route path="/factura" element={<Invoice />} />
    </Routes>
  );
}

export default App;
