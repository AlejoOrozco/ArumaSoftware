import PageLayout from "../../components/common/PageLayout";
import "./Home.css";

const Home = () => (
  <PageLayout pageTitle="Inicio">
    <div className="home-container">
      <h1 className="home-title">
        Bienvenido a Aruma Café <span className="sidebar-logo-cursive">Software</span>
      </h1>
      <p className="home-description">
        Selecciona una sección en la barra lateral para comenzar.
      </p>
    </div>
  </PageLayout>
);

export default Home;

