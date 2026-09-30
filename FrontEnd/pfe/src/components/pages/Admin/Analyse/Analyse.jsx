import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaUserCircle,
  FaBell,
  FaCog,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaMicroscope,
  FaEye,
  FaTimes,
  FaFilePdf,
} from "react-icons/fa";
import { MdBiotech, MdDateRange } from "react-icons/md";
import { BsFileEarmarkMedical } from "react-icons/bs";

import Sidebar from "../Sidebar/Sidebar";
import apiClient from "../../../../config/apiClient";
import API_BASE_URL from "../../../../config/api";
import "./analyse.css";

const buildStorageUrl = (filePath) => {
  if (!filePath) return null;

  const normalized = String(filePath).replace(/\\/g, "/");

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://")
  ) {
    return normalized;
  }

  if (normalized.startsWith("/storage/")) {
    return `${API_BASE_URL}${normalized}`;
  }

  if (normalized.startsWith("storage/")) {
    return `${API_BASE_URL}/${normalized}`;
  }

  return null;
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR");
};

const getValidationLabel = (validation) => {
  if (validation === "validé") return "Validé";
  if (validation === "en_attente") return "En attente";
  if (validation === "rejeté") return "Rejeté";
  return validation || "N/A";
};

const Analyse = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    validees: 0,
    en_attente: 0,
    rejetees: 0,
    avec_anomalies: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingReportId, setGeneratingReportId] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate("/");
    }
  }, [navigate]);

  const fetchAnalyses = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get("/api/analyses/admin/overview", {
        params: {
          search: searchTerm || undefined,
          filter_date: filterDate || undefined,
          filter_status: filterStatus,
          page,
          per_page: perPage,
        },
      });

      setAnalyses(response.data.items || []);
      setStats(
        response.data.stats || {
          total: 0,
          validees: 0,
          en_attente: 0,
          rejetees: 0,
          avec_anomalies: 0,
        }
      );
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail ||
        "Erreur lors du chargement des analyses.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterDate, filterStatus, page, perPage]);

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterDate, filterStatus]);

  const displayedAnalyses = useMemo(() => {
    return analyses.map((analyse) => ({
      ...analyse,
      imageUrl: buildStorageUrl(analyse.image),
    }));
  }, [analyses]);

  const handleViewDetails = useCallback((analyse) => {
    alert(
      `Détails de l'analyse:\n\n` +
        `Biologiste: ${analyse.biologiste || "N/A"}\n` +
        `Email: ${analyse.email || "N/A"}\n` +
        `Type: ${analyse.type_analyse || "N/A"}\n` +
        `Cellule: ${analyse.cellule || "N/A"}\n` +
        `Client: ${analyse.client_name || "N/A"}\n` +
        `Notes: ${analyse.notes || "Aucune note"}\n` +
        `Validation: ${getValidationLabel(analyse.validation)}`
    );
  }, []);
const downloadReportFile = async (downloadUrl, fileName = "rapport.pdf") => {
  try {
    const response = await apiClient.get(downloadUrl, {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);
  } catch (error) {
    alert(
      error.response?.data?.detail ||
        "Erreur lors du téléchargement du rapport."
    );
  }
};
  const handleGenerateReport = useCallback(
    async (analyseId) => {
      try {
        setGeneratingReportId(analyseId);

        const response = await apiClient.post(
          `/api/reports/generate/${analyseId}`
        );

        alert(response.data.message || "Rapport PDF généré avec succès.");

        if (response.data.download_url) {
          await downloadReportFile(
  response.data.download_url,
  `rapport_analyse_${analyseId}.pdf`
);

        }
      } catch (err) {
        const message =
          err.response?.data?.detail ||
          "Erreur lors de la génération du rapport PDF.";
        alert(message);
      } finally {
        setGeneratingReportId(null);
      }
    },
    []
  );
  


  return (
    <div className="analyse-container">
      <Sidebar />

      <div className="main-content">
        <header className="analyse-header">
          <div className="header-left">
            <h1>Supervision des analyses</h1>
          </div>

          <div className="header-right">
            <FaBell className="notification-icon" />
            <FaCog className="settings-icon" />
            <div className="user-info">
              <span className="user-email">
                {user?.email || "admin@biocellvision.com"}
              </span>
              <FaUserCircle className="user-avatar" />
            </div>
          </div>
        </header>

        <div className="welcome-section">
          <FaMicroscope className="welcome-icon" />
          <h2>Supervision des analyses biologiques</h2>
        </div>

        <div className="stats-cards">
          <div className="stat-card-analyses total">
            <div className="stat-icon">
              <BsFileEarmarkMedical />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total analyses</span>
              <span className="stat-value">{stats.total || 0}</span>
            </div>
          </div>

          <div className="stat-card-analyses validees">
            <div className="stat-icon">
              <FaCheckCircle />
            </div>
            <div className="stat-content">
              <span className="stat-label">Validées</span>
              <span className="stat-value">{stats.validees || 0}</span>
            </div>
          </div>

          <div className="stat-card-analyses attente">
            <div className="stat-icon">
              <FaExclamationTriangle />
            </div>
            <div className="stat-content">
              <span className="stat-label">En attente</span>
              <span className="stat-value">{stats.en_attente || 0}</span>
            </div>
          </div>

          <div className="stat-card-analyses rejetees">
            <div className="stat-icon">
              <FaTimesCircle />
            </div>
            <div className="stat-content">
              <span className="stat-label">Rejetées</span>
              <span className="stat-value">{stats.rejetees || 0}</span>
            </div>
          </div>

          <div className="stat-card-analyses anomalies">
            <div className="stat-icon">
              <FaExclamationTriangle />
            </div>
            <div className="stat-content">
              <span className="stat-label">Avec anomalies</span>
              <span className="stat-value">{stats.avec_anomalies || 0}</span>
            </div>
          </div>
        </div>

        <div className="filters-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par biologiste, email, type d'analyse..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <div className="filter-date">
              <FaCalendarAlt className="filter-icon" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>

            <div className="filter-dropdown">
              <FaFilter className="filter-icon" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="validé">Validées</option>
                <option value="en_attente">En attente</option>
                <option value="rejeté">Rejetées</option>
              </select>
            </div>

            <button className="btn-export" type="button">
              <FaDownload /> Exporter
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: "red", fontWeight: 600, marginBottom: "16px" }}>
            {error}
          </p>
        )}

        <div className="table-container">
          <table className="analyse-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Biologiste</th>
                <th>Type d'analyse</th>
                <th>Cellule</th>
                <th>Image</th>
                <th>Anomalie</th>
                <th>Validation</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="no-data">
                    Chargement...
                  </td>
                </tr>
              ) : displayedAnalyses.length > 0 ? (
                displayedAnalyses.map((analyse) => (
                  <tr
                    key={analyse.id}
                    className={analyse.anomalie ? "anomalie-row" : ""}
                  >
                    <td>
                      <div className="date-cell">
                        <MdDateRange className="date-icon" />
                        {formatDate(analyse.date)}
                      </div>
                    </td>

                    <td>
                      <div className="biologiste-cell">
                        <MdBiotech className="biologiste-icon" />
                        <div>
                          <strong>{analyse.biologiste || "N/A"}</strong>
                          <small>{analyse.email || "N/A"}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="analyse-type">
                        {analyse.type_analyse || "N/A"}
                      </span>
                    </td>

                    <td>{analyse.cellule || "N/A"}</td>

                    <td>
                      <div className="image-cell">
                        {analyse.imageUrl ? (
                          <>
                            <img
                              src={analyse.imageUrl}
                              alt="Cellule"
                              className="cell-image"
                              onClick={() => setSelectedImage(analyse.imageUrl)}
                            />
                            <button
                              type="button"
                              className="view-image-btn"
                              onClick={() => setSelectedImage(analyse.imageUrl)}
                            >
                              <FaEye /> Voir
                            </button>
                          </>
                        ) : (
                          <span>Image indisponible</span>
                        )}
                      </div>
                    </td>

                    <td>
                      {analyse.anomalie ? (
                        <div
                          className="anomalie-badge"
                          title={
                            analyse.description_anomalie ||
                            "Anomalie détectée"
                          }
                        >
                          <FaExclamationTriangle />
                          <span>Anomalie</span>
                        </div>
                      ) : (
                        <div className="normal-badge">
                          <FaCheckCircle />
                          <span>Normal</span>
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`validation-badge ${analyse.validation}`}>
                        {analyse.validation === "validé" && <FaCheckCircle />}
                        {analyse.validation === "en_attente" && (
                          <FaExclamationTriangle />
                        )}
                        {analyse.validation === "rejeté" && <FaTimesCircle />}
                        {getValidationLabel(analyse.validation)}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn view"
                          onClick={() => handleViewDetails(analyse)}
                          title="Voir détails"
                        >
                          <FaEye />
                        </button>

                        <button
                          type="button"
                          className="action-btn pdf"
                          onClick={() => handleGenerateReport(analyse.id)}
                          title="Générer le rapport PDF"
                          disabled={generatingReportId === analyse.id}
                        >
                          <FaFilePdf />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="no-data">
                    Aucune analyse trouvée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Précédent
          </button>

          <span className="page-info">
            Page {page} sur {totalPages || 1}
          </span>

          <button
            className="page-btn"
            disabled={page >= totalPages}
            onClick={() =>
              setPage((prev) => Math.min(totalPages || 1, prev + 1))
            }
          >
            Suivant
          </button>
        </div>

        {selectedImage && (
          <div className="image-modal" onClick={() => setSelectedImage(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <img src={selectedImage} alt="Cellule agrandie" />
              <button
                type="button"
                className="close-modal"
                onClick={() => setSelectedImage(null)}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analyse;
