import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaCloudUploadAlt,
  FaImage,
  FaFileImage,
  FaTrashAlt,
  FaPlay,
  FaUser,
  FaFlask,
  FaSlidersH,
  FaCheckCircle,
  FaInfoCircle,
  FaBrain,
  FaClock,
  FaSpinner,
  FaArrowRight,
  FaTimesCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import SidebarBiologist from "../SideBar/SidebarBiologist";
import apiClient from "../../../../config/apiClient";
import "./uploadfile.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const analysisOptions = [
  { value: "hematologie", label: "Hématologie" },
  { value: "spermogramme", label: "Spermogramme" },
  { value: "immunofluorescent", label: "Immunofluorescent" },
];

const UploadFile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const [analysisId, setAnalysisId] = useState(null);
  const [analysisState, setAnalysisState] = useState("idle");
  const [analysisMessage, setAnalysisMessage] = useState("");

  const [formData, setFormData] = useState({
    clientName: "",
    analysisType: "hematologie",
    parameters: "",
    notes: "",
  });

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const currentUser = useMemo(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Erreur lecture user localStorage:", error);
      return null;
    }
  }, []);

  const isFormValid = useMemo(() => {
    return (
      !!preview?.file &&
      formData.clientName.trim().length >= 2 &&
      formData.analysisType.trim() &&
      formData.parameters.trim()
    );
  }, [preview, formData]);

  const selectedAnalysisLabel = useMemo(() => {
    return (
      analysisOptions.find((option) => option.value === formData.analysisType)?.label ||
      "Analyse"
    );
  }, [formData.analysisType]);

  const validateFile = useCallback((file) => {
    if (!file) return "Aucun fichier sélectionné.";
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Format invalide. Utilisez PNG, JPG, JPEG ou WEBP.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Le fichier dépasse 10 MB.";
    }
    return "";
  }, []);

  const handleFile = useCallback(
    (file) => {
      const error = validateFile(file);

      if (error) {
        setFileError(error);

        if (preview?.url) {
          URL.revokeObjectURL(preview.url);
        }

        setPreview(null);
        return;
      }

      setFileError("");
      setSubmitError("");

      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }

      const imageUrl = URL.createObjectURL(file);

      setPreview({
        file,
        url: imageUrl,
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2),
        type: file.type,
      });
    },
    [preview, validateFile]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const openFilePicker = useCallback(() => {
    if (!loading && analysisState !== "processing") {
      fileInputRef.current?.click();
    }
  }, [loading, analysisState]);

  const removeImage = useCallback(() => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    setPreview(null);
    setFileError("");
    setSubmitError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [preview]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setSubmitError("");
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!isFormValid || !preview?.file || loading) return;

      if (!currentUser?.id) {
        setSubmitError("Utilisateur non authentifié. Veuillez vous reconnecter.");
        return;
      }

      setLoading(true);
      setSubmitError("");
      setAnalysisMessage("");
      setAnalysisState("creating");

      try {
        const uploadData = new FormData();
          uploadData.append("clientName", formData.clientName.trim());
          uploadData.append("analysisType", formData.analysisType.trim());
          uploadData.append("parameters", formData.parameters.trim());
          uploadData.append("notes", formData.notes.trim());
          uploadData.append("image", preview.file);


        const createResponse = await apiClient.post("/api/analyses/", uploadData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 15000,
        });

        const createdAnalysisId = createResponse.data?.analysis_id;

        if (!createdAnalysisId) {
          throw new Error("ID de l'analyse introuvable dans la réponse backend.");
        }

        setAnalysisId(createdAnalysisId);
        localStorage.setItem("lastAnalysisId", String(createdAnalysisId));

        setAnalysisState("processing");
        setAnalysisMessage(
          "Analyse créée avec succès. Le module IA traite maintenant l’image en arrière-plan."
        );
            } catch (err) {
        let errorMessage = "Erreur lors du lancement de l’analyse.";

        const detail = err.response?.data?.detail;

        if (typeof detail === "string") {
          errorMessage = detail;
        } else if (Array.isArray(detail)) {
          errorMessage = detail.map((item) => item.msg).join(" | ");
        } else if (detail && typeof detail === "object") {
          errorMessage = detail.msg || JSON.stringify(detail);
        } else if (err.message) {
          errorMessage = err.message;
        }

        setSubmitError(errorMessage);
        setAnalysisState("idle");
      } finally {

        setLoading(false);
      }
    },
    [formData, preview, isFormValid, loading, currentUser]
  );

  useEffect(() => {
    if (!analysisId || analysisState !== "processing") return;

    let cancelled = false;

    const pollResult = async () => {
      try {
        const response = await apiClient.get(`/api/analyses/resultats/${analysisId}`, {
          timeout: 10000,
        });

        if (cancelled) return;

        const data = response.data;
        const analysisStatus = data?.analysis_status;
        const resultStatus = data?.result_status;

        if (analysisStatus === "completed" && resultStatus === "generated") {
          setAnalysisState("ready");
          setAnalysisMessage(
            "Le traitement IA est terminé. Le résultat est prêt à être consulté."
          );
          localStorage.setItem("lastAnalysisId", String(analysisId));
          return;
        }

        if (
          analysisStatus === "completed" &&
          (resultStatus === "validated" || resultStatus === "rejected")
        ) {
          setAnalysisState("ready");
          setAnalysisMessage("Le résultat existe déjà et peut être consulté.");
          localStorage.setItem("lastAnalysisId", String(analysisId));
          return;
        }

        if (analysisStatus === "failed" || resultStatus === "failed") {
          setAnalysisState("failed");
          setAnalysisMessage(
            "Le traitement IA a échoué. Vérifiez le backend ou relancez une nouvelle analyse."
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Erreur polling résultat:", error);
        }
      }
    };

    pollResult();
    const interval = setInterval(pollResult, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [analysisId, analysisState]);

  const renderAnalysisStatusCard = () => {
    if (!analysisState || analysisState === "idle") return null;

    const baseStyle = {
      background: "#fff",
      borderRadius: "18px",
      padding: "18px 20px",
      marginBottom: "20px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    };

    if (analysisState === "creating") {
      return (
        <section style={baseStyle}>
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <FaSpinner className="spin-icon-bio" />
            Création de l’analyse
          </h2>
          <p style={{ color: "#555", marginBottom: 0 }}>
            Le backend enregistre l’image et crée le dossier d’analyse.
          </p>
        </section>
      );
    }

    if (analysisState === "processing") {
      return (
        <section style={baseStyle}>
          <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <FaClock />
            Analyse IA en cours
          </h2>
          <p style={{ color: "#555", marginBottom: 10 }}>{analysisMessage}</p>
          <p style={{ color: "#1E8F47", fontWeight: 600, marginBottom: 0 }}>
            ID de l’analyse : {analysisId}
          </p>
        </section>
      );
    }

    if (analysisState === "ready") {
      return (
        <section style={baseStyle}>
          <h2
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#1E8F47",
            }}
          >
            <FaCheckCircle />
            Résultat prêt
          </h2>
          <p style={{ color: "#555" }}>{analysisMessage}</p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
            <button
              type="button"
              className="launch-btn-bio"
              onClick={() => navigate(`/resultat-ai/${analysisId}`)}
            >
              <FaArrowRight />
              Voir le résultat AI
            </button>
          </div>
        </section>
      );
    }

    if (analysisState === "failed") {
      return (
        <section style={baseStyle}>
          <h2
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#D32F2F",
            }}
          >
            <FaTimesCircle />
            Échec du traitement
          </h2>
          <p style={{ color: "#555", marginBottom: 0 }}>{analysisMessage}</p>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="upload-page-bio">
      <SidebarBiologist />

      <main className="upload-main-bio">
        <header className="upload-header-bio">
          <div>
            <h1>Nouvelle analyse IA</h1>
            <p className="upload-subtitle-bio">
              Importez une image biologique, renseignez les informations
              d’analyse, puis laissez le backend lancer automatiquement la
              classification et la segmentation.
            </p>
          </div>
        </header>

        {renderAnalysisStatusCard()}

        <section
          style={{
            background: "#fff",
            borderRadius: "16px",
            padding: "18px 20px",
            marginBottom: "20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <FaBrain />
            Comment fonctionne l’analyse IA ?
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              marginTop: "14px",
            }}
          >
            <div>
              <strong>1. Upload sécurisé</strong>
              <p style={{ marginTop: "6px", color: "#555" }}>
                L’image est envoyée au backend puis enregistrée localement avec
                un nom unique.
              </p>
            </div>

            <div>
              <strong>2. Création de l’analyse</strong>
              <p style={{ marginTop: "6px", color: "#555" }}>
                Le système crée une fiche d’analyse et un résultat initial en attente.
              </p>
            </div>

            <div>
              <strong>3. Pipeline IA automatique</strong>
              <p style={{ marginTop: "6px", color: "#555" }}>
                Le backend lance l’IA en arrière-plan pour classifier et segmenter l’image.
              </p>
            </div>

            <div>
              <strong>4. Validation biologique</strong>
              <p style={{ marginTop: "6px", color: "#555" }}>
                Le biologiste consulte ensuite le résultat et décide de le valider ou le rejeter.
              </p>
            </div>
          </div>
        </section>

        <section className="upload-content-bio">
          <div className="upload-card-bio upload-dropzone-card-bio">
            <div className="card-header-bio">
              <h2>
                <FaImage />
                Import d’image
              </h2>
              <p>
                Glissez-déposez une image microscopique ou cliquez pour la
                sélectionner depuis votre appareil.
              </p>
            </div>

            <div
              className={`dropzone-bio ${isDragging ? "dragging-bio" : ""} ${
                preview ? "has-preview-bio" : ""
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={openFilePicker}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !loading) {
                  openFilePicker();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden-input-bio"
                onChange={handleFileInputChange}
                disabled={loading || analysisState === "processing"}
              />

              {!preview ? (
                <div className="dropzone-placeholder-bio">
                  <div className="dropzone-icon-bio">
                    <FaCloudUploadAlt />
                  </div>
                  <h3>Déposez votre image ici</h3>
                  <p>ou cliquez pour importer depuis votre appareil</p>
                  <span className="dropzone-hint-bio">
                    Formats acceptés : PNG, JPG, JPEG, WEBP — taille max 10 MB
                  </span>
                </div>
              ) : (
                <div className="preview-wrapper-bio">
                  <img
                    src={preview.url}
                    alt="Aperçu du fichier importé"
                    className="preview-image-bio"
                  />

                  <div className="preview-info-bio">
                    <div className="preview-meta-bio">
                      <div className="preview-file-bio">
                        <FaFileImage />
                        <div>
                          <strong>{preview.name}</strong>
                          <span>{preview.size} MB</span>
                        </div>
                      </div>

                      <span className="preview-valid-bio">
                        <FaCheckCircle />
                        Image prête pour l’analyse
                      </span>
                    </div>

                    <button
                      type="button"
                      className="remove-image-btn-bio"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage();
                      }}
                      disabled={loading || analysisState === "processing"}
                    >
                      <FaTrashAlt />
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {fileError && <p className="file-error-bio">{fileError}</p>}
            {submitError && <p className="file-error-bio">{submitError}</p>}
          </div>

          <div className="upload-card-bio upload-form-card-bio">
            <div className="card-header-bio">
              <h2>
                <FaFlask />
                Informations d’analyse
              </h2>
              <p>
                Ces informations sont enregistrées avec l’analyse et seront
                visibles sur la page résultat.
              </p>
            </div>

            <form className="analysis-form-bio" onSubmit={handleSubmit}>
              <div className="form-group-bio">
                <label htmlFor="clientName">
                  <FaUser />
                  Nom du client
                </label>
                <input
                  id="clientName"
                  name="clientName"
                  type="text"
                  placeholder="Ex: Clinique Pasteur"
                  value={formData.clientName}
                  onChange={handleChange}
                  disabled={loading || analysisState === "processing"}
                />
              </div>

              <div className="form-group-bio">
                <label htmlFor="analysisType">
                  <FaFlask />
                  Type d’analyse
                </label>
                <select
                  id="analysisType"
                  name="analysisType"
                  value={formData.analysisType}
                  onChange={handleChange}
                  disabled={loading || analysisState === "processing"}
                >
                  {analysisOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-bio">
                <label htmlFor="parameters">
                  <FaSlidersH />
                  Paramètres
                </label>
                <input
                  id="parameters"
                  name="parameters"
                  type="text"
                  placeholder="Ex: leucocytes, morphologie, densité..."
                  value={formData.parameters}
                  onChange={handleChange}
                  disabled={loading || analysisState === "processing"}
                />
              </div>

              <div className="form-group-bio">
                <label htmlFor="notes">
                  <FaInfoCircle />
                  Notes supplémentaires
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows="5"
                  placeholder="Ajouter des détails utiles pour aider l’interprétation biologique..."
                  value={formData.notes}
                  onChange={handleChange}
                  disabled={loading || analysisState === "processing"}
                />
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "14px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <h3
                  style={{
                    marginTop: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <FaClock />
                  Résumé avant lancement
                </h3>
                <p style={{ margin: "8px 0", color: "#555" }}>
                  <strong>Type choisi :</strong> {selectedAnalysisLabel}
                </p>
                <p style={{ margin: "8px 0", color: "#555" }}>
                  <strong>Image :</strong> {preview?.name || "Aucune image"}
                </p>
                <p style={{ margin: "8px 0", color: "#555" }}>
                  Après l’envoi, cette page vous indiquera quand le résultat sera prêt.
                </p>
              </div>

              <button
                type="submit"
                className="launch-btn-bio"
                disabled={!isFormValid || loading || analysisState === "processing"}
              >
                <FaPlay />
                {loading
                  ? "Création de l’analyse..."
                  : analysisState === "processing"
                  ? "Analyse IA en cours..."
                  : "Lancer l’analyse IA"}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default UploadFile;
