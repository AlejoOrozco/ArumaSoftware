import React from "react";

const Home = () => (
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
      Bienvenido a Aruma Café
    </h1>
    <p style={{ color: "#444", marginBottom: 32 }}>
      Selecciona una sección en la barra lateral para comenzar.
    </p>
  </div>
);

export default Home;