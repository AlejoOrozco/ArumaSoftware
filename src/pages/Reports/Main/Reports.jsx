import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import PageLayout from "../../../components/common/PageLayout";
import "./Reports.css";

const Reports = () => {
  const navigate = useNavigate();

  // State for invoices
  const [invoices, setInvoices] = useState([]);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // State for products
  const [products, setProducts] = useState([]);
  const [productQuery, setProductQuery] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      const invoiceSnap = await getDocs(collection(db, "Invoice"));
      setInvoices(invoiceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFilteredInvoices(invoiceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const productSnap = await getDocs(collection(db, "Product"));
      setProducts(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFilteredProducts(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  // Filter invoices
  useEffect(() => {
    setFilteredInvoices(
      invoices.filter(inv =>
        inv.id.toLowerCase().includes(invoiceQuery.toLowerCase()) ||
        (inv.Comment && inv.Comment.toLowerCase().includes(invoiceQuery.toLowerCase()))
      )
    );
  }, [invoiceQuery, invoices]);

  // Filter products
  useEffect(() => {
    setFilteredProducts(
      products.filter(prod =>
        prod.id.toLowerCase().includes(productQuery.toLowerCase()) ||
        (prod.Name && prod.Name.toLowerCase().includes(productQuery.toLowerCase()))
      )
    );
  }, [productQuery, products]);

  return (
    <PageLayout pageTitle="Reportes">
      <div className="reports-container">
        <div className="reports-cards">
          <div
            className="report-card report-card-btn"
            onClick={() => navigate("/reportes/facturas")}
          >
            <h2>Historial de Facturas</h2>
            <p>Ver y buscar facturas registradas</p>
          </div>
          <div
            className="report-card report-card-btn"
            onClick={() => navigate("/reportes/productos")}
          >
            <h2>Historial de Productos</h2>
            <p>Ver y buscar productos registrados</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Reports;