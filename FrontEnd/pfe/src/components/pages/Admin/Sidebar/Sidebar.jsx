import { useNavigate, useLocation } from "react-router-dom";
import { FaTachometerAlt, FaUsers, FaChartBar, FaSignOutAlt } from "react-icons/fa";
import "./sidebar.css";

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Pour savoir sur quelle page on est

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Fonction pour vérifier si le lien est actif
  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>BioCellVision</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul>
          <li 
            className={isActive("/dashboard-admin") ? "active" : ""}
            onClick={() => handleNavigation("/dashboard-admin")}
          >
            <FaTachometerAlt className="icon" />
            <span>Dashboard</span>
          </li>
          
          <li 
            className={isActive("/gestion-utilisateur") ? "active" : ""}
            onClick={() => handleNavigation("/gestion-utilisateur")}
          >
            <FaUsers className="icon" />
            <span>Gestion utilisateur</span>
          </li>
          
          <li 
            className={isActive("/analyse") ? "active" : ""}
            onClick={() => handleNavigation("/analyse")}
          >
            <FaChartBar className="icon" />
            <span>Analyse</span>
          </li>
          
          <li onClick={handleLogout} style={{ cursor: 'pointer' }}>
            <FaSignOutAlt className="icon" />
            <span>Déconnexion</span>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;