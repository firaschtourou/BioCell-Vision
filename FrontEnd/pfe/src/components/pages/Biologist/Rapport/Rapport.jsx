import { useEffect, useMemo, useState, useCallback } from "react";
import {
  FaFileAlt,
  FaDownload,
  FaTrashAlt,
  FaSearch,
  FaFolderOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";

import SidebarBiologist from "../SideBar/SidebarBiologist";
import apiClient from "../../../../config/apiClient";
import "./rapport.css";

const Rapport = () => {
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("tous");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/api/reports/biologist/my-reports");
      setReports(response.data.items || []);
    } catch (error) {
      alert(error.response?.data?.detail || "Erreur chargement rapports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const getAnalysisId = useCallback((report) => {
    return report.analysis_id || report.analyse_id || report.analysisId || null;
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !search ||
        (report.client_name || "").toLowerCase().includes(search) ||
        (report.report_name || "").toLowerCase().includes(search) ||
        (report.comment || "").toLowerCase().includes(search);

      const matchesStatus =
        statusFilter === "tous" ? true : report.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [reports, searchTerm, statusFilter]);

  const handleDownload = useCallback(async (report) => {
    if (!report.download_url) {
      alert("Lien de téléchargement indisponible.");
      return;
    }

    try {
      const response = await apiClient.get(report.download_url, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.report_name || "rapport"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      let message = "Erreur lors du téléchargement du rapport.";

      const detail = error.response?.data?.detail;
      if (typeof detail === "string") {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((item) => item.msg).join(" | ");
      } else if (detail && typeof detail === "object") {
        message = detail.msg || JSON.stringify(detail);
      }

      alert(message);
    }
  }, []);

  const handleValidate = useCallback(
    async (report) => {
      const analysisId = getAnalysisId(report);

      if (!analysisId) {
        alert("ID de l’analyse introuvable pour ce rapport.");
        return;
      }

      const confirmed = window.confirm(
        "Confirmez-vous la validation de cette analyse après consultation du rapport ?"
      );
      if (!confirmed) return;

      try {
        setActionLoadingId(report.id);

        await apiClient.put(`/api/analyses/resultats/${analysisId}/validate`, {
          comment: report.comment || "",
        });

        alert("Analyse validée avec succès.");
        await fetchReports();
      } catch (error) {
        alert(error.response?.data?.detail || "Erreur lors de la validation.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchReports, getAnalysisId]
  );

  const handleReject = useCallback(
    async (report) => {
      const analysisId = getAnalysisId(report);

      if (!analysisId) {
        alert("ID de l’analyse introuvable pour ce rapport.");
        return;
      }

      const confirmed = window.confirm(
        "Confirmez-vous le rejet de cette analyse après consultation du rapport ?"
      );
      if (!confirmed) return;

      try {
        setActionLoadingId(report.id);

        await apiClient.put(`/api/analyses/resultats/${analysisId}/reject`, {
          comment: report.comment || "",
        });

        alert("Analyse rejetée.");
        await fetchReports();
      } catch (error) {
        alert(error.response?.data?.detail || "Erreur lors du rejet.");
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchReports, getAnalysisId]
  );

  const handleDelete = useCallback(async (id) => {
    const confirmed = window.confirm(
      "Voulez-vous vraiment supprimer ce rapport ?"
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/api/reports/${id}`);
      setReports((prev) => prev.filter((report) => report.id !== id));
    } catch (error) {
      alert(error.response?.data?.detail || "Erreur suppression rapport");
    }
  }, []);

  const getStatusBadge = useCallback((status) => {
    if (status === "disponible") {
      return (
        <span className="status-badge-report-bio available-bio">
          <FaCheckCircle />
          Disponible
        </span>
      );
    }

    return (
      <span className="status-badge-report-bio pending-bio">
        <FaClock />
        En attente
      </span>
    );
  }, []);

  const getDecisionBadge = useCallback((report) => {
    const decision =
      report.validation_status || report.result_status || report.decision;

    if (decision === "validated") {
      return (
        <span className="status-badge-report-bio available-bio">
          <FaCheckCircle />
          Validée
        </span>
      );
    }

    if (decision === "rejected") {
      return (
        <span className="status-badge-report-bio pending-bio">
          <FaTimesCircle />
          Rejetée
        </span>
      );
    }

    return (
      <span className="status-badge-report-bio pending-bio">
        <FaClock />
        En attente décision
      </span>
    );
  }, []);

  const canDecide = useCallback((report) => {
    const decision =
      report.validation_status || report.result_status || report.decision;

    return report.status === "disponible" && !["validated", "rejected"].includes(decision);
  }, []);

  return (
    <div className="rapport-page-bio">
      <SidebarBiologist />

      <main className="rapport-main-bio">
        <header className="rapport-header-bio">
          <div>
            <h1>Rapports AI</h1>
            <p className="rapport-subtitle-bio">
              Consultez le rapport généré, puis validez ou rejetez l’analyse.
            </p>
          </div>
        </header>

        <section className="rapport-toolbar-bio">
          <div className="search-box-bio">
            <FaSearch />
            <input
              type="text"
              placeholder="Rechercher par client, rapport ou commentaire..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-box-bio">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="tous">Tous les statuts</option>
              <option value="disponible">Disponible</option>
              <option value="en_attente">En attente</option>
            </select>
          </div>
        </section>

        <section className="rapport-card-bio">
          <div className="rapport-card-header-bio">
            <h2>
              <FaFileAlt />
              Liste des rapports
            </h2>
            <span className="rapport-count-bio">
              {filteredReports.length} rapport(s)
            </span>
          </div>

          {loading ? (
            <div className="empty-state-bio">
              <h3>Chargement...</h3>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="table-wrapper-bio">
              <table className="rapport-table-bio">
                <thead>
                  <tr>
                    <th>Nom du client</th>
                    <th>Nom du rapport</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Décision</th>
                    <th>Commentaire</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredReports.map((report) => {
                    const isActionLoading = actionLoadingId === report.id;
                    const decisionAllowed = canDecide(report);

                    return (
                      <tr key={report.id}>
                        <td className="client-cell-bio">
                          {report.client_name || "N/A"}
                        </td>

                        <td>
                          <div className="report-name-cell-bio">
                            <FaFolderOpen />
                            <span>{report.report_name || "Rapport sans nom"}</span>
                          </div>
                        </td>

                        <td>
                          <div className="date-cell-bio">
                            <FaCalendarAlt />
                            <span>
                              {report.date
                                ? new Date(report.date).toLocaleDateString("fr-FR")
                                : "N/A"}
                            </span>
                          </div>
                        </td>

                        <td>{getStatusBadge(report.status)}</td>

                        <td>{getDecisionBadge(report)}</td>

                        <td>
                          <p className="report-comment-bio">
                            {report.comment || "Aucun commentaire"}
                          </p>
                        </td>

                        <td>
                          <div className="table-actions-bio">
                            <button
                              type="button"
                              className="table-btn-bio download-bio"
                              onClick={() => handleDownload(report)}
                              disabled={report.status !== "disponible"}
                            >
                              <FaDownload />
                              Télécharger
                            </button>

                            <button
                              type="button"
                              className="table-btn-bio validate-bio"
                              onClick={() => handleValidate(report)}
                              disabled={!decisionAllowed || isActionLoading}
                            >
                              <FaCheckCircle />
                              {isActionLoading ? "Traitement..." : "Valider"}
                            </button>

                            <button
                              type="button"
                              className="table-btn-bio delete-bio"
                              onClick={() => handleReject(report)}
                              disabled={!decisionAllowed || isActionLoading}
                            >
                              <FaTimesCircle />
                              {isActionLoading ? "Traitement..." : "Rejeter"}
                            </button>

                            <button
                              type="button"
                              className="table-btn-bio delete-bio"
                              onClick={() => handleDelete(report.id)}
                              disabled={isActionLoading}
                            >
                              <FaTrashAlt />
                              Supprimer
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-bio">
              <div className="empty-icon-bio">
                <FaFileAlt />
              </div>
              <h3>Aucun rapport trouvé</h3>
              <p>Aucun résultat ne correspond à votre recherche.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Rapport;