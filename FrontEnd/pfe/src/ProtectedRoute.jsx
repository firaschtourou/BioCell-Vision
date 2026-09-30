// src/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, allowedRole }) => {
  const location = useLocation();

  let user = null;
  const token = localStorage.getItem("token");

  try {
    const storedUser = localStorage.getItem("user");
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Erreur lecture user depuis localStorage:", error);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  console.log("ProtectedRoute token =", token);
  console.log("ProtectedRoute user =", user);
  console.log("ProtectedRoute allowedRole =", allowedRole);

  if (!token || !user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (allowedRole && user.role !== allowedRole) {
    if (user.role === "admin") {
      return <Navigate to="/dashboard-admin" replace />;
    }

    if (user.role === "biologist") {
      return <Navigate to="/dashboard-biologist" replace />;
    }

    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;