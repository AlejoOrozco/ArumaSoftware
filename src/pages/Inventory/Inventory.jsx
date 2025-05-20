import React from "react";

const Inventory = () => (
  <div
    style={{
      background: "#fff",
      borderRadius: "20px",
      boxShadow: "0 4px 32px rgba(80, 50, 200, 0.10)",
      padding: "48px 56px",
      minWidth: "400px",
      maxWidth: "700px",
      textAlign: "center"
    }}
  >
    <h1 style={{ fontWeight: 700, fontSize: "2rem", marginBottom: 16 }}>
      Productos
    </h1>
    <p style={{ color: "#444", marginBottom: 32 }}>
      Aquí puedes ver y administrar los productos de Aruma Café.
    </p>
  </div>
);

export default Inventory;