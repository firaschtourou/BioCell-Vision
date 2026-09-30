import "./login.css";
import Slide from "../Slide/Slide";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../../../../config/api";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: email.trim(),
          password,
        },
        {
          timeout: 10000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;
      console.log("Réponse login =", data);

      if (data?.success && data?.user && data?.access_token) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.access_token);

        console.log("user sauvegardé =", localStorage.getItem("user"));
        console.log("token sauvegardé =", localStorage.getItem("token"));

        if (data.user.role === "admin") {
          navigate("/dashboard-admin", { replace: true });
        } else if (data.user.role === "biologist") {
          navigate("/dashboard-biologist", { replace: true });
        } else {
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          setError("Rôle utilisateur non reconnu.");
        }
      } else {
        setError("Réponse backend invalide.");
      }
    } catch (err) {
      console.error("❌ Erreur login:", err);

      if (err.code === "ECONNABORTED") {
        setError("Le serveur met trop de temps à répondre.");
      } else if (err.response) {
        setError(
          err.response.data?.detail ||
            err.response.data?.message ||
            "Email ou mot de passe incorrect."
        );
      } else if (err.request) {
        setError("Impossible de joindre le serveur backend.");
      } else {
        setError("Une erreur inattendue est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="left-side">
        <div className="login-box">
          <h1>Login</h1>

          {error && (
            <div
              className="error-message"
              style={{ color: "red", marginBottom: "15px" }}
            >
              {error}
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
                placeholder="votre@email.com"
                disabled={loading}
              />
            </div>

            <label>Password</label>
            <div className="input-group">
              <FaLock className="icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Votre mot de passe"
                disabled={loading}
              />
            </div>

            <div className="forgot-container">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (!loading) navigate("/send-mail");
                }}
              >
                Forget Password ?
              </a>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Connexion en cours..." : "Submit"}
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

export default Login;