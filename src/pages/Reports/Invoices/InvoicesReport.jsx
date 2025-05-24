import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "../Main/Reports.css";

const InvoicesReport = () => {
  const [invoices, setInvoices] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "Invoice"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInvoices(data);
      setFiltered(data);
    };
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "Product"));
      const map = {};
      snap.docs.forEach(doc => {
        map[doc.id] = doc.data().Name || "Producto desconocido";
      });
      setProductsMap(map);
    };
    fetchData();
    fetchProducts();
  }, []);

  useEffect(() => {
    setFiltered(
      invoices.filter(inv =>
        inv.id.toLowerCase().includes(query.toLowerCase()) ||
        (inv.Comment && inv.Comment.toLowerCase().includes(query.toLowerCase()))
      )
    );
  }, [query, invoices]);

  return (
    <PageLayout pageTitle="Reporte de Facturas">
      <div className="reports-container">
        <div className="report-card" style={{ margin: "0 auto" }}>
          <h2>Facturas</h2>
          <input
            type="text"
            placeholder="Buscar factura por ID o comentario..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="report-search"
          />
          <ul className="report-list">
            {filtered.map(inv => (
              <li
                key={inv.id}
                className="report-list-item"
                onClick={() => setSelected(inv)}
              >
                Factura | Total: ${inv.Total}
              </li>
            ))}
          </ul>
          {selected && (
            <div className="report-modal-backdrop" onClick={() => setSelected(null)}>
              <div className="report-modal" onClick={e => e.stopPropagation()}>
                <button className="report-modal-close" onClick={() => setSelected(null)}>&times;</button>
                <h3>Detalles de la Factura</h3>
                <div><b>ID:</b> {selected.id}</div>
                <div><b>Fecha:</b> {selected.Date}</div>
                <div><b>Total:</b> ${selected.Total}</div>
                <div><b>Comentario:</b> {selected.Comment}</div>
                <div><b>Productos:</b>
                  <ul>
                    {selected.Products.map((p, idx) => (
                      <li key={idx}>
                        {productsMap[p.id] || "Producto desconocido"} | Cantidad: {p.Quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default InvoicesReport;
