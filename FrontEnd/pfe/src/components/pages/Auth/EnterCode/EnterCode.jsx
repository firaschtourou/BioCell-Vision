import { useRef, useState, useEffect } from "react";
import "./entercode.css";
import Slide from "../Slide/Slide";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import API_BASE_URL from "../../../../config/api";
const EnterCode = () => {
  const inputsRef = useRef([]);
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  // Récupérer l'email stocké
  useEffect(() => {
    const storedEmail = localStorage.getItem("resetEmail");
    if (!storedEmail) {
      // Pas d'email trouvé, rediriger vers la page d'envoi
      navigate("/send-mail");
    } else {
      setEmail(storedEmail);
    }
  }, [navigate]);

  const handleChange = (e, index) => {
    const value = e.target.value;
    // Ne permettre que les chiffres
    if (value && !/^\d+$/.test(value)) {
      e.target.value = "";
      return;
    }

    if (value.length === 1 && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Si backspace est pressé et que l'input est vide, aller à l'input précédent
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Récupérer le code complet
    const code = inputsRef.current.map(input => input.value).join("");

    if (code.length !== 6) {
      setError("Veuillez entrer les 6 chiffres du code");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/verify-code`, {
        email,
        code
      });

      if (response.data.success) {
        // Stocker l'ID utilisateur pour la réinitialisation
        localStorage.setItem("resetUserId", response.data.user_id.toString());
        // Rediriger vers la page de réinitialisation
        navigate("/reset-password");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || "Code invalide ou expiré";
      setError(errorMessage);
      
      // Vider les inputs en cas d'erreur
      inputsRef.current.forEach(input => {
        if (input) input.value = "";
      });
      inputsRef.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-side">
        <div className="login-box">
          <h1>Enter Code</h1>

          {error && <div className="error-message" style={{color: 'red', marginBottom: '15px'}}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <label className="code-label">
              Code envoyé à {email ? email.replace(/(.{3})(.*)(?=@)/, "$1***") : "votre email"}
            </label>

            <div className="code-container">
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  type="text"
                  maxLength="1"
                  className="code-input"
                  onChange={(e) => handleChange(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  ref={(el) => (inputsRef.current[index] = el)}
                  disabled={loading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Vérification..." : "Vérifier"}
            </button>

            <p style={{marginTop: '20px', fontSize: '14px', color: '#666'}}>
              <a href="/send-mail" onClick={(e) => { e.preventDefault(); navigate("/send-mail"); }}>
                Renvoyer le code
              </a>
            </p>
          </form>
        </div>
      </div>

      <div>
        <Slide />
      </div>
    </div>
  );
};

export default EnterCode;