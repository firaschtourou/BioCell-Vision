import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  FaFlask, 
  FaCheckCircle, 
  FaHourglassHalf,
  FaFileMedical,
  FaCalendarCheck,
  FaChartLine,
  FaMicroscope,
  FaDna,
  FaVial,
  FaArrowRight
} from "react-icons/fa";
import SidebarBiologist from "../SideBar/SidebarBiologist";
import "./dashboardBiologist.css";

const DashboardBiologist = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    analysesEnCours: 5,
    analysesTerminees: 2,
    echantillons: 20,
    analysesMois: 45,
    tauxReussite: 92,
    tempsMoyen: "2.5h"
  });

  const [recentAnalyses, setRecentAnalyses] = useState([
    { id: 1, client: "Clinique Pasteur", type: "Hématologie", date: "2024-02-25", status: "terminé" },
    { id: 2, client: "Dr. Martin", type: "Biochimie", date: "2024-02-24", status: "en_cours" },
    { id: 3, client: "Hôpital Central", type: "Microbiologie", date: "2024-02-24", status: "en_attente" },
    { id: 4, client: "Labo City", type: "Cytologie", date: "2024-02-23", status: "terminé" },
    { id: 5, client: "Centre Médical", type: "Immunologie", date: "2024-02-23", status: "en_cours" }
  ]);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      if (userData.role !== 'biologist') {
        navigate("/dashboard-admin");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  const handleQuickAction = (action) => {
    switch(action) {
      case 'nouvelle':
        navigate("/upload");
        break;
      case 'analyses':
        navigate("/historique");
        break;
      case 'rapports':
        navigate("/rapport");
        break;
      default:
        break;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'terminé':
        return <span className="status-badge-bio completed-bio"><FaCheckCircle /> Terminé</span>;
      case 'en_cours':
        return <span className="status-badge-bio in-progress-bio"><FaHourglassHalf /> En cours</span>;
      case 'en_attente':
        return <span className="status-badge-bio pending-bio"><FaFileMedical /> En attente</span>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard-container-bio">
      <SidebarBiologist />
      
      <div className="main-content-bio">
        {/* En-tête avec bienvenue */}
        <header className="dashboard-header-bio">
          <div className="welcome-area-bio">
            <h1>Welcome Biologist !</h1>
            <p className="welcome-subtitle-bio">
              {new Date().toLocaleDateString('fr-FR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="user-profile-bio">
            <div className="user-info-bio">
              <span className="user-email-bio">{user?.email || "biologist@biocellvision.com"}</span>
              <div className="user-avatar-bio">
                <FaMicroscope />
              </div>
            </div>
          </div>
        </header>

        {/* Cartes de statistiques principales */}
        <div className="stats-grid-bio">
          <div className="stat-card-bio analyses-attente-bio">
            <div className="stat-icon-wrapper-bio">
              <FaHourglassHalf />
            </div>
            <div className="stat-content-bio">
              <span className="stat-label-bio">En attente</span>
              <span className="stat-value-bio">{stats.analysesEnCours}</span>
            </div>
          </div>

          <div className="stat-card-bio analyses-terminees-bio">
            <div className="stat-icon-wrapper-bio">
              <FaCheckCircle />
            </div>
            <div className="stat-content-bio">
              <span className="stat-label-bio">Terminées</span>
              <span className="stat-value-bio">{stats.analysesTerminees}</span>
            </div>
          </div>

          <div className="stat-card-bio echantillons-bio">
            <div className="stat-icon-wrapper-bio">
              <FaVial />
            </div>
            <div className="stat-content-bio">
              <span className="stat-label-bio">Échantillons</span>
              <span className="stat-value-bio">{stats.echantillons}</span>
            </div>
          </div>
        </div>

        {/* Statistiques secondaires */}
        <div className="secondary-stats-bio">
          <div className="secondary-stat-bio">
            <FaCalendarCheck className="stat-icon-bio" />
            <div>
              <span className="stat-label-bio">Analyses ce mois</span>
              <span className="stat-value-small-bio">{stats.analysesMois}</span>
            </div>
          </div>
          <div className="secondary-stat-bio">
            <FaChartLine className="stat-icon-bio" />
            <div>
              <span className="stat-label-bio">Taux de réussite</span>
              <span className="stat-value-small-bio">{stats.tauxReussite}%</span>
            </div>
          </div>
          <div className="secondary-stat-bio">
            <FaFlask className="stat-icon-bio" />
            <div>
              <span className="stat-label-bio">Temps moyen</span>
              <span className="stat-value-small-bio">{stats.tempsMoyen}</span>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="quick-actions-bio">
          <h2>Actions rapides</h2>
          <div className="action-buttons-bio">
            <button 
              className="action-btn-bio primary-bio"
              onClick={() => handleQuickAction('nouvelle')}
            >
              <FaDna />
              <span>Nouvelle analyse</span>
              <FaArrowRight className="arrow-bio" />
            </button>
            <button 
              className="action-btn-bio secondary-bio"
              onClick={() => handleQuickAction('analyses')}
            >
              <FaFlask />
              <span>Voir mes analyses</span>
              <FaArrowRight className="arrow-bio" />
            </button>
            <button 
              className="action-btn-bio tertiary-bio"
              onClick={() => handleQuickAction('rapports')}
            >
              <FaFileMedical />
              <span>Rapports</span>
              <FaArrowRight className="arrow-bio" />
            </button>
          </div>
        </div>

        {/* Analyses récentes */}
        <div className="recent-analyses-bio">
          <div className="section-header-bio">
            <h2>Analyses récentes</h2>
            <button className="view-all-bio" onClick={() => navigate("/historique")}>
              Voir tout <FaArrowRight />
            </button>
          </div>
          
          <div className="table-container-bio">
            <table className="analyses-table-bio">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Type d'analyse</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Rapport</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((analyse) => (
                  <tr key={analyse.id}>
                    <td className="client-name-bio">{analyse.client}</td>
                    <td>{analyse.type}</td>
                    <td>{new Date(analyse.date).toLocaleDateString('fr-FR')}</td>
                    <td>{getStatusBadge(analyse.status)}</td>
                    <td>
                      {analyse.status === 'terminé' ? (
                        <button className="rapport-btn-bio">
                          <FaFileMedical /> Voir
                        </button>
                      ) : (
                        <span className="rapport-disabled-bio">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardBiologist;