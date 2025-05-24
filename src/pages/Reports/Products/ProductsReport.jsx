import React, { useEffect, useState } from "react";
import { db } from "../../../config/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import PageLayout from "../../../components/common/PageLayout";
import "../Main/Reports.css";

const ProductsReport = () => {
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");
  const [filtered, setFiltered] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDocs(collection(db, "Product"));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
      setFiltered(data);
    };
    fetchData();
  }, []);

  useEffect(() => {
    setFiltered(
      products.filter(prod =>
        (prod.Name && prod.Name.toLowerCase().includes(query.toLowerCase()))
      )
    );
  }, [query, products]);

  return (
    <PageLayout pageTitle="Reporte de Productos">
      <div className="reports-container">
        <div className="report-card" style={{ margin: "0 auto" }}>
          <h2>Productos</h2>
          <input
            type="text"
            placeholder="Buscar producto por nombre..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="report-search"
          />
          <ul className="report-list">
            {filtered.map(prod => (
              <li
                key={prod.id}
                className="report-list-item"
                onClick={() => setSelected(prod)}
              >
                {prod.Name}
              </li>
            ))}
          </ul>
          {selected && (
            <div className="report-modal-backdrop" onClick={() => setSelected(null)}>
              <div className="report-modal" onClick={e => e.stopPropagation()}>
                <button className="report-modal-close" onClick={() => setSelected(null)}>&times;</button>
                <h3>Detalles del Producto</h3>
                <div><b>Nombre:</b> {selected.Name}</div>
                <div><b>Precio de venta:</b> ${selected.Purchase_Sell}</div>
                <div><b>Stock actual:</b> {selected.Stock_Current}</div>
                <div><b>Peso:</b> {selected.Weight} {selected.Unit_Measure}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default ProductsReport;
