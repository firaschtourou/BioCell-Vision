import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/pages/Auth/Login/Login";
import SendMail from "./components/pages/Auth/SendMail/SendMail";
import EnterCode from "./components/pages/Auth/EnterCode/EnterCode";
import ResetPassword from "./components/pages/Auth/ResetPassword/ResetPassword";
import ProtectedRoute from "./ProtectedRoute";

import DashboardBiologist from "./components/pages/Biologist/DashboardBiologist/DashboardBiologist";
import DashboardAdmin from "./components/pages/Admin/Dashboard/DashboardAdmin";
import GestionUtilisateur from "./components/pages/Admin/GestionUsers/GestionUtilisateur";
import AddUser from "./components/pages/Admin/GestionUsers/AddUser";
import Analyse from "./components/pages/Admin/Analyse/Analyse";
import UploadFile from "./components/pages/Biologist/UploadFile/UploadFile";
import ResultatAi from "./components/pages/Biologist/ResultatAI/ResultatAi";
import Rapport from "./components/pages/Biologist/Rapport/Rapport";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes publiques */}
        <Route path="/" element={<Login />} />
        <Route path="/send-mail" element={<SendMail />} />
        <Route path="/enter-code" element={<EnterCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Admin */}
        <Route
          path="/dashboard-admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestion-utilisateur"
          element={
            <ProtectedRoute allowedRole="admin">
              <GestionUtilisateur />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestion-utilisateur/ajouter"
          element={
            <ProtectedRoute allowedRole="admin">
              <AddUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analyse"
          element={
            <ProtectedRoute allowedRole="admin">
              <Analyse />
            </ProtectedRoute>
          }
        />

        {/* Biologist */}
        <Route
          path="/dashboard-biologist"
          element={
            <ProtectedRoute allowedRole="biologist">
              <DashboardBiologist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute allowedRole="biologist">
              <UploadFile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resultat-ai/:analysisId"
          element={
            <ProtectedRoute allowedRole="biologist">
              <ResultatAi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rapport"
          element={
            <ProtectedRoute allowedRole="biologist">
              <Rapport />
            </ProtectedRoute>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;