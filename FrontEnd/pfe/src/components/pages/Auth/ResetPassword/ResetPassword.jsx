import "./resetpassword.css";
import Slide from "../Slide/Slide";
import { FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import API_BASE_URL from "../../../../config/api";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Récupérer l'ID utilisateur stocké
  useEffect(() => {
    const storedUserId = localStorage.getItem("resetUserId");
    if (!storedUserId) {
      // Pas d'ID utilisateur, rediriger vers la première étape
      navigate("/send-mail");
    } else {
      setUserId(parseInt(storedUserId));
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    // Validation des mots de passe
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
        user_id: userId,
        new_password: password
      });

      if (response.data.success) {
        setSuccess("Mot de passe modifié avec succès !");
        
        // Nettoyer le stockage local
        localStorage.removeItem("resetEmail");
        localStorage.removeItem("resetUserId");
        
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Erreur lors de la réinitialisation";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-side">
        <div className="login-box">
          <h1>Reset Password</h1>

          {error && <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}
          {success && <div className="success-message" style={{color: 'green', marginBottom: '15px'}}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <label>Nouveau mot de passe</label>
            <div className="input-group">
              <FaLock className="icon" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Minimum 6 caractères"
                disabled={loading}
              />
            </div>

            <label>Confirmer le mot de passe</label>
            <div className="input-group">
              <FaLock className="icon" />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Retapez votre mot de passe"
                disabled={loading}
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Modification en cours..." : "Submit"}
            </button>
          </form>
        </div>
      </div>

      <div>
        <Slide />
      </div>
    </div>
  );
};

export default ResetPassword;