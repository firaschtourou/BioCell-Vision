import "./sendmail.css";
import Slide from "../Slide/Slide";
import { FaEnvelope } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../../config/api";

const SendMail = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    console.log("📧 Envoi de la requête pour:", email);
    console.log("📡 URL:", `${API_BASE_URL}/api/auth/request-reset`);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/request-reset`, {
        email
      });

      console.log("✅ Réponse reçue:", response.data);

      if (response.data.success) {
        setSuccess("Code de vérification envoyé ! Vérifiez votre boîte email.");
        localStorage.setItem("resetEmail", email);
        
        // Redirection après 2 secondes
        setTimeout(() => {
          navigate("/enter-code");
        }, 2000);
      }
    } catch (err) {
      console.error("❌ Erreur complète:", err);
      
      if (err.code === 'ECONNREFUSED') {
        setError("Impossible de contacter le serveur. Vérifiez que le backend est lancé.");
      } else if (err.response) {
        // Le serveur a répondu avec une erreur
        console.error("Réponse d'erreur:", err.response.data);
        setError(err.response.data?.detail || "Erreur lors de l'envoi du code");
      } else if (err.request) {
        // La requête a été faite mais pas de réponse
        console.error("Pas de réponse du serveur");
        setError("Le serveur ne répond pas. Vérifiez qu'il est bien lancé.");
      } else {
        setError("Erreur inattendue");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-side">
        <div className="login-box">
          <h1>Send Email</h1>

          {error && (
            <div className="error-message" style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px'
            }}>
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message" style={{
              backgroundColor: '#e8f5e9',
              color: '#2e7d32',
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px'
            }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <div className="input-group">
              <FaEnvelope className="icon" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Entrez votre email"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? "Envoi en cours..." : "Submit"}
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

export default SendMail;