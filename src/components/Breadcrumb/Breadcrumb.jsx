import { useLocation, Link } from "react-router-dom";
import routesConfig from "../../config/routesConfig";
import "./Breadcrumb.css";

const Breadcrumb = () => {
  const location = useLocation();
  const pathNames = location.pathname.split("/").filter((x) => x);

  const findRouteDetails = (path) => {
    const breadcrumbItem = routesConfig.find((route) => route.path === path);
    return breadcrumbItem
      ? {
          name: breadcrumbItem.componentName,
          readableName: breadcrumbItem.title,
        }
      : {
          name: path,
          readableName: path,
        };
  };

  return (
    <div className="d-none d-md-flex  breadcrumb-container d-block ">
      <div className="breadcrumb-list d-flex">
        <div className="breadcrumb-item me-2">
          <Link to="/">
            <i className="bi bi-house-door-fill"></i>
          </Link>
        </div>
        {pathNames.map((value, index) => {
          const to = `/${pathNames.slice(0, index + 1).join("/")}`;
          return (
            <div key={to} className="breadcrumb-item">
              <Link to={to} className=" ms-2">
                {findRouteDetails(to).readableName}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Breadcrumb;
