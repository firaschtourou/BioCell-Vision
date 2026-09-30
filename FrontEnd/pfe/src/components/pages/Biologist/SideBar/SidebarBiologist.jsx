import { useNavigate, useLocation } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUpload,
  FaBrain,
  FaFileAlt,
  FaSignOutAlt,
} from "react-icons/fa";
import "./sidebarBiologist.css";

const SidebarBiologist = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("lastAnalysisId");
    navigate("/");
  };

  const handleNavigation = (path) => {
    if (path === "/resultat-ai") {
      const lastAnalysisId = localStorage.getItem("lastAnalysisId");

      if (!lastAnalysisId) {
        alert("Aucun résultat disponible. Veuillez d'abord créer une analyse.");
        navigate("/upload");
        return;
      }

      navigate(`/resultat-ai/${lastAnalysisId}`);
      return;
    }

    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/resultat-ai") {
      return location.pathname.startsWith("/resultat-ai/");
    }

    return location.pathname === path;
  };

  const menuItems = [
    { path: "/dashboard-biologist", icon: FaTachometerAlt, label: "Dashboard" },
    { path: "/upload", icon: FaUpload, label: "Upload" },
    { path: "/resultat-ai", icon: FaBrain, label: "Résultat AI" },
    { path: "/rapport", icon: FaFileAlt, label: "Rapport" },
  ];

  return (
    <div className="sidebar-bio">
      <div className="sidebar-header-bio">
        <h2>BioCellVision</h2>
        <p className="user-role-bio">Biologiste</p>
      </div>

      <nav className="sidebar-nav-bio">
        <ul>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <li
                key={item.path}
                className={active ? "active-bio" : ""}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="icon-bio" />
                <span>{item.label}</span>
                {active && <div className="active-indicator-bio" />}
              </li>
            );
          })}

          <li className="logout-item-bio" onClick={handleLogout}>
            <FaSignOutAlt className="icon-bio" />
            <span>Déconnexion</span>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default SidebarBiologist;