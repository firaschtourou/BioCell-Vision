import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBrain,
  FaCheckCircle,
  FaTimesCircle,
  FaCommentDots,
  FaVial,
  FaChartPie,
  FaImage,
  FaSpinner,
  FaClock,
  FaExclamationTriangle,
  FaSyncAlt,
  FaClipboardCheck,
} from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";

import SidebarBiologist from "../SideBar/SidebarBiologist";
import API_BASE_URL from "../../../../config/api";
import apiClient from "../../../../config/apiClient";
import "./resulatai.css";

/**
 * IMPORTANT:
 * - L’IA renvoie généralement des chemins du type:
 *   - "/storage/....png"  (idéal)
 *   - "storage/....png"
 *   - "results/....png"  (si ton backend expose les résultats via /storage)
 * - Le but: retourner une URL web HTTP/HTTPS lisible par le navigateur.
 */
const buildStorageUrl = (filePath) => {
  if (!filePath) return null;

  const raw = String(filePath).replace(/\\/g, "/").trim();
  if (!raw) return null;

  // ✅ déjà une URL
  if (/^https?:\/\//i.test(raw)) return raw;

  // ✅ si backend renvoie /storage/...
  if (raw.startsWith("/storage/")) {
    return `${API_BASE_URL}${raw}`;
  }

  // ✅ si backend renvoie storage/...
  if (raw.startsWith("storage/")) {
    return `${API_BASE_URL}/${raw}`;
  }

  // ✅ Cas: backend renvoie results/...
  if (raw.startsWith("results/")) {
    return `${API_BASE_URL}/storage/${raw.slice("results/".length)}`;
  }

  // ✅ Cas: Windows path disque -> URL
  // Exemple reçu:
  // C:/Users/fchto/Desktop/storage/outputs/annotated/....png
  const winPrefix = "C:/Users/fchto/Desktop/storage/outputs/annotated/";
  const winPrefix2 = "C:/Users/fchto/Desktop/storage/outputs/"; // si autre arborescence

  let rel = null;

  if (raw.toLowerCase().startsWith(winPrefix.toLowerCase())) {
    rel = raw.slice(winPrefix.length); // multi_cell_pipeline_combined/....png
    // on suppose que ton serveur sert ce dossier web sous /storage/outputs/annotated/...
    return `${API_BASE_URL}/storage/outputs/annotated/${rel}`;
  }

  if (raw.toLowerCase().startsWith(winPrefix2.toLowerCase())) {
    rel = raw.slice(winPrefix2.length);
    return `${API_BASE_URL}/storage/outputs/${rel}`;
  }

  // ✅ Si on voit "/storage/" quelque part
  const idx = raw.toLowerCase().indexOf("/storage/");
  if (idx !== -1) {
    const sub = raw.substring(idx); // /storage/...
    return `${API_BASE_URL}${sub}`;
  }

  return null;
};

const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("fr-FR");
};

const getWorkflowState = (analysisData) => {
  const analysisStatus = analysisData?.analysis_status;
  const resultStatus = analysisData?.result_status;
  const validationStatus = analysisData?.validation_status;

  if (analysisStatus === "failed" || resultStatus === "failed") {
    return {
      key: "failed",
      label: "Échec du traitement IA",
      icon: <FaExclamationTriangle />,
      description: "Le traitement automatique n’a pas pu se terminer correctement.",
    };
  }

  if (validationStatus === "validated" || resultStatus === "validated") {
    return {
      key: "validated",
      label: "Résultat validé par le biologiste",
      icon: <FaClipboardCheck />,
      description:
        "Le résultat généré par l’IA a été relu et validé manuellement après consultation du rapport.",
    };
  }

  if (validationStatus === "rejected" || resultStatus === "rejected") {
    return {
      key: "rejected",
      label: "Résultat rejeté par le biologiste",
      icon: <FaTimesCircle />,
      description:
        "Le résultat généré par l’IA a été rejeté après consultation du rapport.",
    };
  }

  if (analysisStatus === "completed" && resultStatus === "generated") {
    return {
      key: "generated",
      label: "Résultat IA disponible",
      icon: <FaCheckCircle />,
      description:
        "Le résultat est prêt. Ajoutez un commentaire si nécessaire, puis consultez le rapport avant validation.",
    };
  }

  if (analysisStatus === "processing") {
    return {
      key: "processing",
      label: "Analyse IA en cours",
      icon: <FaSpinner className="spin-icon-bio" />,
      description:
        "Le module IA exécute actuellement la classification et la segmentation.",
    };
  }

  return {
    key: "uploaded",
    label: "Analyse créée, en attente de traitement",
    icon: <FaClock />,
    description: "L’image est enregistrée et le traitement va démarrer.",
  };
};

const ResultatAi = () => {
  const { analysisId } = useParams();
  const navigate = useNavigate();

  const [comment, setComment] = useState("");
  const [analysisData, setAnalysisData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");

  // ✅ cellule sélectionnée
  const [selectedCell, setSelectedCell] = useState(null);

  const workflow = useMemo(() => getWorkflowState(analysisData), [analysisData]);

  const isPending = useMemo(() => {
    return workflow.key === "uploaded" || workflow.key === "processing";
  }, [workflow.key]);

  const canReview = useMemo(() => {
    return ["generated", "validated", "rejected"].includes(workflow.key);
  }, [workflow.key]);

  const fetchResult = useCallback(
    async (silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);

        setError("");

        const response = await apiClient.get(
          `/api/analyses/resultats/${analysisId}`
        );

        setAnalysisData(response.data);

        // Mettre à jour commentaire par défaut
        setComment((prev) => prev || response.data.biologist_comment || "");

        // Sélectionner la 1ère cellule si jamais
        const firstCell = response.data?.predicted_cells?.[0] || null;
        setSelectedCell((prev) => prev ?? firstCell);
      } catch (err) {
        const errorMessage =
          err.response?.data?.detail ||
          "Erreur lors de la récupération du résultat.";
        setError(errorMessage);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [analysisId]
  );

  useEffect(() => {
    if (!analysisId) return;
    fetchResult(false);
  }, [analysisId, fetchResult]);

  useEffect(() => {
    if (!analysisId || !isPending) return;

    const interval = setInterval(() => {
      fetchResult(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [analysisId, isPending, fetchResult]);

  const handleSendComment = async () => {
    if (!comment.trim()) {
      alert("Veuillez écrire un commentaire avant l’envoi.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      await apiClient.put(
        `/api/analyses/resultats/${analysisId}/comment`,
        { comment: comment.trim() }
      );

      await fetchResult(true);
      alert("Commentaire envoyé avec succès.");
    } catch (err) {
      const errorMessage =
        err.response?.data?.detail || "Erreur lors de l’envoi du commentaire.";
      setError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ URLs d’images
  const originalImageSrc = useMemo(
    () => buildStorageUrl(analysisData?.original_image_path),
    [analysisData]
  );

  const annotatedImageSrc = useMemo(
    () => buildStorageUrl(analysisData?.annotated_image_path),
    [analysisData]
  );

  const selectedCellImageSrc = useMemo(() => {
    return buildStorageUrl(selectedCell?.isolated_image_path);
  }, [selectedCell]);
  useEffect(() => {
  if (selectedCell?.isolated_image_path) {
    const url = buildStorageUrl(selectedCell?.isolated_image_path);
    console.log("RAW PATH:", selectedCell?.isolated_image_path);
    console.log("BUILT URL:", url);
  }
}, [selectedCell]);

  // Optionnel: debug rapide
  // useEffect(() => {
  //   console.log("selectedCell isolated_image_path:", selectedCell?.isolated_image_path);
  //   console.log("selectedCellImageSrc:", selectedCellImageSrc);
  // }, [selectedCellImageSrc, selectedCell]);

  if (loading) {
    return (
      <div className="result-ai-page-bio">
        <SidebarBiologist />
        <main className="result-ai-main-bio">
          <header className="result-ai-header-bio">
            <div>
              <h1>Résultat de l’analyse IA</h1>
              <p className="result-ai-subtitle-bio">Chargement du dossier d’analyse...</p>
            </div>
          </header>
        </main>
      </div>
    );
  }

  if (error && !analysisData) {
    return (
      <div className="result-ai-page-bio">
        <SidebarBiologist />
        <main className="result-ai-main-bio">
          <header className="result-ai-header-bio">
            <div>
              <h1>Résultat de l’analyse IA</h1>
              <p className="result-ai-subtitle-bio" style={{ color: "red" }}>
                {error}
              </p>
            </div>
          </header>
        </main>
      </div>
    );
  }

  return (
    <div className="result-ai-page-bio">
      <SidebarBiologist />

      <main className="result-ai-main-bio">
        <header className="result-ai-header-bio">
          <div>
            <h1>Résultat de l’analyse IA</h1>
            <p className="result-ai-subtitle-bio">
              Consultez les résultats IA. La validation ou le rejet se fait uniquement après consultation du rapport.
            </p>
          </div>
        </header>

        {error && (
          <p style={{ color: "red", marginBottom: "16px", fontWeight: 600 }}>
            {error}
          </p>
        )}

        {/* SECTION WORKFLOW + INFOS */}
        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "18px 20px",
            marginBottom: "20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                {workflow.icon}
                {workflow.label}
              </h2>
              <p style={{ margin: "8px 0 0 0", color: "#555" }}>{workflow.description}</p>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => fetchResult(true)} disabled={refreshing || actionLoading}>
                <FaSyncAlt />
                {refreshing ? "Actualisation..." : "Actualiser"}
              </button>

              <button type="button" onClick={() => navigate("/upload")}>
                Nouvelle analyse
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: "16px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "12px",
            }}
          >
            <div>
              <strong>ID Analyse :</strong> {analysisData?.analysis_id}
            </div>
            <div>
              <strong>Client :</strong> {analysisData?.client_name || "N/A"}
            </div>
            <div>
              <strong>Type :</strong> {analysisData?.analysis_type || "N/A"}
            </div>
            <div>
              <strong>Paramètres :</strong> {analysisData?.parameters || "N/A"}
            </div>
            <div>
              <strong>Créé le :</strong> {formatDateTime(analysisData?.created_at)}
            </div>
            <div>
              <strong>Dernière mise à jour :</strong> {formatDateTime(analysisData?.updated_at)}
            </div>
          </div>
        </section>

        {/* IMAGE SECTION */}
        <section className="result-ai-content-bio">
          <div className="result-card-bio result-image-card-bio">
            <div className="card-header-bio">
              <h2>
                <FaImage /> Images de l’analyse
              </h2>
            </div>

            <div style={{ display: "grid", gap: "18px" }}>
              <div className="predicted-image-wrapper-bio">
                <h3 style={{ marginBottom: "10px", padding: "12px 12px 0" }}>Image originale</h3>

                {originalImageSrc ? (
                  <img
                    src={originalImageSrc}
                    alt="Image originale"
                    className="predicted-image-bio"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    Image originale non disponible.
                  </div>
                )}
              </div>

              <div className="predicted-image-wrapper-bio">
                <h3 style={{ marginBottom: "10px", padding: "12px 12px 0" }}>
                  Image annotée par l’IA
                </h3>

                {annotatedImageSrc ? (
                  <img
                    src={annotatedImageSrc}
                    alt="Image annotée par l'IA"
                    className="predicted-image-bio"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      console.log("Annotated image failed:", annotatedImageSrc);
                    }}
                  />
                ) : (
                  <div style={{ padding: "20px", textAlign: "center" }}>
                    {isPending
                      ? "Le traitement est en cours. L’image annotée apparaîtra automatiquement."
                      : "Image annotée non disponible."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAILS + CELLS */}
          <div className="result-card-bio result-details-card-bio">
            <div className="card-header-bio">
              <h2>
                <FaChartPie /> Résumé clinique et technique
              </h2>
            </div>

            <div className="global-status-box-bio">
              <span className="global-status-label-bio">Interprétation globale</span>
              <div
                className={`global-status-value-bio ${
                  analysisData?.global_state === "Normale" ? "normal-bio" : "abnormal-bio"
                }`}
              >
                {analysisData?.global_state === "Normale" ? <FaCheckCircle /> : <FaTimesCircle />}
                <span>
                  {isPending ? "Analyse en cours" : `Image ${analysisData?.global_state || "Inconnue"}`}
                </span>
              </div>

              <p className="global-status-text-bio">
                {analysisData?.short_conclusion ||
                  (isPending ? "Le backend traite encore l’image." : "Aucune conclusion disponible.")}
              </p>
            </div>

            <div className="stats-grid-result-bio">
              <div className="stat-box-result-bio">
                <span className="stat-title-result-bio">Classe prédite</span>
                <strong>{analysisData?.predicted_class || "N/A"}</strong>
              </div>

              <div className="stat-box-result-bio">
                <span className="stat-title-result-bio">Cellules détectées</span>
                <strong>{analysisData?.total_cells ?? 0}</strong>
              </div>

              <div className="stat-box-result-bio">
                <span className="stat-title-result-bio">Cellules normales</span>
                <strong>{analysisData?.normal_cells ?? 0}</strong>
              </div>

              <div className="stat-box-result-bio abnormal-stat-bio">
                <span className="stat-title-result-bio">Cellules anormales</span>
                <strong>{analysisData?.abnormal_cells ?? 0}</strong>
              </div>

              <div className="stat-box-result-bio">
                <span className="stat-title-result-bio">Type d’anomalie</span>
                <strong>
                  {analysisData?.anomaly_type ? analysisData.anomaly_type : isPending ? "—" : "N/A"}
                </strong>
              </div>
            </div>

            <div className="image-explanation-box-bio" style={{ marginTop: "18px" }}>
              <h3>
                <FaBrain /> Explication générée par l’IA
              </h3>
              <p>
                {analysisData?.ai_explanation || (isPending ? "Le moteur IA est en cours d’exécution." : "Aucune explication disponible.")}
              </p>
            </div>

            {/* CELLS LIST + CLICK DETAIL */}
            <div className="predicted-cells-box-bio" style={{ marginTop: 16 }}>
              <h3>
                <FaVial /> Détail des cellules/objets prédits
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                {/* Liste */}
                <div className="predicted-cells-list-bio">
                  {analysisData?.predicted_cells?.length ? (
                    analysisData.predicted_cells.map((cell, idx) => {
                      const cellId = cell?.id ?? idx;
                      const isSelected = selectedCell?.id === cellId;

                      const isAbnormal =
                        String(cell?.state || "")
                          .toLowerCase()
                          .trim() === "anormale";

                      return (
                        <button
                          key={cellId}
                          type="button"
                          className="predicted-cell-item-bio"
                          onClick={() => setSelectedCell(cell)}
                          style={{
                            textAlign: "left",
                            cursor: "pointer",
                            border: isSelected ? "2px solid #3b82f6" : "1px solid #eee",
                            borderRadius: 10,
                            padding: 10,
                            background: isSelected ? "#eff6ff" : "#fff",
                          }}
                          disabled={isPending}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <span className="cell-name-bio">{cell?.label ?? `Cellule ${cellId}`}</span>

                            <span
                              className={`cell-state-bio ${
                                isAbnormal ? "cell-abnormal-bio" : "cell-normal-bio"
                              }`}
                            >
                              {isAbnormal ? <FaTimesCircle /> : <FaCheckCircle />}
                              {cell?.state ?? "N/A"}
                            </span>
                          </div>

                          <div style={{ marginTop: 6, fontSize: 13, color: "#555" }}>
                            <strong>Type d’anomalie :</strong>{" "}
                            {cell?.anomaly_type ? cell.anomaly_type : "N/A"}
                          </div>

                          {cell?.anomaly_confidence !== null &&
                            cell?.anomaly_confidence !== undefined && (
                              <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                                <strong>Confiance :</strong> {cell.anomaly_confidence}
                              </div>
                            )}
                        </button>
                      );
                    })
                  ) : (
                    <p style={{ margin: 0 }}>
                      {isPending
                        ? "La liste détaillée sera disponible après le traitement."
                        : "Aucun détail cellulaire disponible."}
                    </p>
                  )}
                </div>

                {/* Détail de la cellule cliquée */}
                <div
                  className="result-card-bio"
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    background: "#fff",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
                  }}
                >
                  <h3 style={{ marginTop: 0 }}>Cellule sélectionnée</h3>

                  {!selectedCell ? (
                    <p style={{ color: "#777" }}>Cliquez sur une cellule pour voir ses détails.</p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <h4 style={{ margin: "8px 0" }}>Image cellule</h4>

                        {selectedCellImageSrc ? (
                          <img
                            src={selectedCellImageSrc}
                            alt={`Cellule ${selectedCell?.id}`}
                            style={{
                              width: "100%",
                              borderRadius: 12,
                              border: "1px solid #eee",
                              display: "block",
                            }}
                            loading="lazy"
                            onError={(e) => {
                              console.log("Cell image failed:", selectedCellImageSrc);
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <div style={{ padding: 14, border: "1px dashed #ddd", borderRadius: 12 }}>
                            Image isolée indisponible pour cette cellule.
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 style={{ margin: "8px 0" }}>Toutes les informations</h4>

                        <div style={{ display: "grid", gap: 8 }}>
                          {Object.entries(selectedCell || {}).map(([key, value]) => (
                            <div key={key} style={{ fontSize: 13, color: "#555" }}>
                              <strong style={{ color: "#333" }}>{key} :</strong>{" "}
                              {value === null || value === undefined ? (
                                <span style={{ color: "#888" }}>N/A</span>
                              ) : typeof value === "object" ? (
                                <span>{JSON.stringify(value)}</span>
                              ) : (
                                <span>{String(value)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Commentaire */}
            <div className="comment-box-bio">
              <label htmlFor="biologist-comment">
                <FaCommentDots />
                Commentaire du biologiste
              </label>
              <textarea
                id="biologist-comment"
                placeholder="Ajouter votre interprétation biologique..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows="5"
                disabled={!canReview || actionLoading}
              />
            </div>

            <div className="result-actions-bio">
              <button
                type="button"
                className="action-result-btn-bio validate-bio"
                onClick={handleSendComment}
                disabled={!canReview || actionLoading || !comment.trim()}
              >
                <FaCommentDots />
                {actionLoading ? "Envoi..." : "Envoyer le commentaire"}
              </button>

              <button
                type="button"
                className="action-result-btn-bio"
                onClick={() => navigate("/rapport")}
                disabled={!canReview || actionLoading}
              >
                Consulter les rapports
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ResultatAi;