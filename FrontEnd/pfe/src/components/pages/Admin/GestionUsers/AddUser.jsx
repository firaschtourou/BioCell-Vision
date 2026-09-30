import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { 
  FaUserCircle, 
  FaBell,
  FaCog,
  FaUserPlus,
  FaEnvelope,
  FaLock,
  FaUserTag,
  FaCopy,
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle
} from "react-icons/fa";
import { MdAdminPanelSettings, MdBiotech } from "react-icons/md";
import Sidebar from "../Sidebar/Sidebar";
import "./addUser.css";
import API_BASE_URL from "../../../../config/api";
import axios from "axios";

const AddUser = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    password: "",
    role: "biologist"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [apiError, setApiError] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");

  // Vérifier que l'utilisateur est connecté
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      // Vérifier que l'utilisateur est admin
      if (userData.role !== 'admin') {
        navigate("/dashboard-biologist");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Fonction pour générer un mot de passe aléatoire (respectant les critères backend)
  const generatePassword = () => {
    const length = 12;
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const special = "!@#$%^&*";
    
    // Garantir au moins un caractère de chaque type
    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    // Compléter avec des caractères aléatoires
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mélanger le mot de passe
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Générer un mot de passe au chargement du composant
  useEffect(() => {
    const newPassword = generatePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword
    }));
    setGeneratedPassword(newPassword);
  }, []);

  // Gérer les changements dans le formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ quand l'utilisateur commence à taper
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
    // Effacer l'erreur API quand l'utilisateur modifie le formulaire
    if (apiError) {
      setApiError("");
    }
  };

  // Rafraîchir le mot de passe
  const handleRefreshPassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword
    }));
    setGeneratedPassword(newPassword);
    setPasswordCopied(false);
  };

  // Copier le mot de passe
  const handleCopyPassword = () => {
    navigator.clipboard.writeText(formData.password);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  // Valider le formulaire
  const validateForm = () => {
    const errors = {};
    
    if (!formData.nom.trim()) {
      errors.nom = "Le nom est requis";
    } else if (formData.nom.length < 3) {
      errors.nom = "Le nom doit contenir au moins 3 caractères";
    }
    
    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "L'email n'est pas valide";
    }
    
    // Validation du mot de passe (critères backend)
    if (formData.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    } else if (!/[A-Z]/.test(formData.password)) {
      errors.password = "Le mot de passe doit contenir au moins une majuscule";
    } else if (!/[0-9]/.test(formData.password)) {
      errors.password = "Le mot de passe doit contenir au moins un chiffre";
    }
    
    if (!formData.role) {
      errors.role = "Le rôle est requis";
    }
    
    return errors;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation côté client
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setIsSubmitting(true);
    setApiError("");
    
    try {
      console.log("📤 Envoi des données au backend:", {
        nom: formData.nom.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      });

      // Appel API vers le backend
      const response = await axios.post(
        `${API_BASE_URL}/api/users/`,
        {
          nom: formData.nom.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role
        },
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      console.log("✅ Réponse du backend:", response.data);
      
      if (response.data.success) {
        setSubmitSuccess(true);
        
        // Stocker le mot de passe généré pour l'afficher si besoin
        if (response.data.password) {
          setGeneratedPassword(response.data.password);
        }
        
        // Redirection après 2 secondes
        setTimeout(() => {
          navigate("/gestion-utilisateur");
        }, 2000);
      }
      
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout:", error);
      
      // Gestion détaillée des erreurs
      if (error.response) {
        // Le serveur a répondu avec un code d'erreur
        console.error("Détails de l'erreur:", error.response.data);
        
        const status = error.response.status;
        const errorDetail = error.response.data?.detail || error.response.data?.message;
        
        if (status === 409) {
          setApiError("Cet email est déjà utilisé. Veuillez en choisir un autre.");
        } else if (status === 400) {
          if (errorDetail && typeof errorDetail === 'object') {
            // Erreur de validation Pydantic
            const validationErrors = {};
            Object.keys(errorDetail).forEach(key => {
              validationErrors[key] = errorDetail[key];
            });
            setFormErrors(validationErrors);
          } else {
            setApiError(errorDetail || "Données invalides. Vérifiez le formulaire.");
          }
        } else if (status === 401) {
          setApiError("Vous n'êtes pas autorisé à effectuer cette action.");
          setTimeout(() => navigate("/"), 3000);
        } else if (status === 500) {
          setApiError("Erreur serveur. Veuillez réessayer plus tard.");
        } else {
          setApiError(errorDetail || "Une erreur est survenue. Veuillez réessayer.");
        }
      } else if (error.request) {
        // La requête a été faite mais pas de réponse
        console.error("Pas de réponse du serveur");
        setApiError("Impossible de contacter le serveur. Vérifiez que le backend est lancé.");
      } else {
        // Erreur de configuration
        setApiError(`Erreur: ${error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-user-container">
      <Sidebar />
      
      <div className="main-content">
        {/* Header */}
        <header className="add-user-header">
          <div className="header-left">
            <button 
              className="back-btn"
              onClick={() => navigate("/gestion-utilisateur")}
            >
              <FaArrowLeft /> Retour
            </button>
            <h1>Ajouter un utilisateur</h1>
          </div>
          
          <div className="header-right">
            <FaBell className="notification-icon" />
            <FaCog className="settings-icon" />
            <div className="user-info">
              <span className="user-email">{user?.email || "admin@biocellvision.com"}</span>
              <FaUserCircle className="user-avatar" />
            </div>
          </div>
        </header>

        {/* Formulaire */}
        <div className="form-container">
          {submitSuccess ? (
            <div className="success-message">
              <FaCheckCircle className="success-icon" />
              <h2>Utilisateur ajouté avec succès !</h2>
              <p>Le mot de passe généré est : <strong>{generatedPassword}</strong></p>
              <p className="password-warning">
                <FaExclamationTriangle /> Notez ce mot de passe, il ne sera plus affiché.
              </p>
              <p>Redirection vers la liste des utilisateurs...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="add-user-form">
              <h2>Nouvel utilisateur</h2>
              <p className="form-subtitle">Remplissez les informations ci-dessous</p>

              {/* Message d'erreur API */}
              {apiError && (
                <div className="api-error-message">
                  <FaExclamationTriangle /> {apiError}
                </div>
              )}

              {/* Champ Nom */}
              <div className="form-group">
                <label htmlFor="nom">
                  <FaUserCircle className="input-icon" />
                  Nom complet
                </label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Entrez le nom complet"
                  className={formErrors.nom ? "error" : ""}
                  disabled={isSubmitting}
                />
                {formErrors.nom && (
                  <span className="error-message">
                    <FaTimesCircle /> {formErrors.nom}
                  </span>
                )}
              </div>

              {/* Champ Email */}
              <div className="form-group">
                <label htmlFor="email">
                  <FaEnvelope className="input-icon" />
                  Adresse email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="exemple@email.com"
                  className={formErrors.email ? "error" : ""}
                  disabled={isSubmitting}
                />
                {formErrors.email && (
                  <span className="error-message">
                    <FaTimesCircle /> {formErrors.email}
                  </span>
                )}
              </div>

              {/* Champ Mot de passe (généré automatiquement) */}
              <div className="form-group">
                <label htmlFor="password">
                  <FaLock className="input-icon" />
                  Mot de passe (généré automatiquement)
                </label>
                <div className="password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    readOnly
                    className="password-input"
                  />
                  <div className="password-actions">
                    <button
                      type="button"
                      className="password-action-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Masquer" : "Afficher"}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                    <button
                      type="button"
                      className="password-action-btn"
                      onClick={handleCopyPassword}
                      title="Copier"
                      disabled={isSubmitting}
                    >
                      <FaCopy />
                    </button>
                    <button
                      type="button"
                      className="password-action-btn refresh"
                      onClick={handleRefreshPassword}
                      title="Générer un nouveau mot de passe"
                      disabled={isSubmitting}
                    >
                      ⟳
                    </button>
                  </div>
                </div>
                {passwordCopied && (
                  <span className="copy-success">
                    <FaCheckCircle /> Mot de passe copié !
                  </span>
                )}
                {formErrors.password && (
                  <span className="error-message">
                    <FaTimesCircle /> {formErrors.password}
                  </span>
                )}
                <small className="password-hint">
                  Le mot de passe doit contenir au moins 8 caractères, une majuscule et un chiffre
                </small>
              </div>

              {/* Sélection du rôle */}
              <div className="form-group">
                <label>
                  <FaUserTag className="input-icon" />
                  Rôle de l'utilisateur
                </label>
                <div className="role-selector">
                  <div 
                    className={`role-card ${formData.role === 'biologist' ? 'selected' : ''}`}
                    onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, role: 'biologist' }))}
                  >
                    <MdBiotech className="role-icon" />
                    <div className="role-info">
                      <h4>Biologiste</h4>
                      <p>Accès à l'espace biologiste</p>
                    </div>
                    {formData.role === 'biologist' && (
                      <FaCheckCircle className="selected-icon" />
                    )}
                  </div>

                  <div 
                    className={`role-card ${formData.role === 'admin' ? 'selected' : ''}`}
                    onClick={() => !isSubmitting && setFormData(prev => ({ ...prev, role: 'admin' }))}
                  >
                    <MdAdminPanelSettings className="role-icon" />
                    <div className="role-info">
                      <h4>Administrateur</h4>
                      <p>Accès à tous les espaces</p>
                    </div>
                    {formData.role === 'admin' && (
                      <FaCheckCircle className="selected-icon" />
                    )}
                  </div>
                </div>
                {formErrors.role && (
                  <span className="error-message">
                    <FaTimesCircle /> {formErrors.role}
                  </span>
                )}
              </div>

              {/* Boutons d'action */}
              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => navigate("/gestion-utilisateur")}
                  disabled={isSubmitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Ajout en cours...</>
                  ) : (
                    <><FaUserPlus /> Ajouter l'utilisateur</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddUser;