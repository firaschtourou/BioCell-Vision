import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { 
  FaUserCircle, 
  FaBell,
  FaCog,
  FaSearch,
  FaFilter,
  FaPlus,
  FaEdit,
  FaTrash,
  FaToggleOn,
  FaToggleOff,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaSyncAlt,
  FaSave,
  FaBan
} from "react-icons/fa";
import Sidebar from "../Sidebar/Sidebar";
import "./gestionUtilisateur.css";
import API_BASE_URL from "../../../../config/api";
import axios from "axios";

const GestionUtilisateur = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // État pour l'édition en ligne
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nom: "",
    email: "",
    role: ""
  });
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  
  // Filtres
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const itemsPerPage = 10;

  // Vérifier l'authentification
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentUser(userData);
      if (userData.role !== 'admin') {
        navigate("/dashboard-biologist");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Fonction pour récupérer les utilisateurs
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `${API_BASE_URL}/api/users/?page=${currentPage}&limit=${itemsPerPage}`;
      
      if (filterRole !== 'all') {
        url += `&role=${filterRole}`;
      }
      
      const response = await axios.get(url);
      
      if (response.data?.success) {
        let fetchedUsers = response.data.users || [];
        
        // Appliquer le filtre status côté client
        if (filterStatus !== 'all') {
          const statusValue = filterStatus === 'active' ? 1 : 0;
          fetchedUsers = fetchedUsers.filter(u => u.status === statusValue);
        }
        
        // Appliquer la recherche côté client
        if (searchTerm.trim() !== "") {
          const term = searchTerm.toLowerCase().trim();
          fetchedUsers = fetchedUsers.filter(u => 
            u.nom?.toLowerCase().includes(term) || 
            u.email?.toLowerCase().includes(term)
          );
        }
        
        setUsers(fetchedUsers);
        setTotalUsers(response.data.total || 0);
        setTotalPages(response.data.total_pages || 1);
      } else {
        setError(response.data?.message || "Erreur lors du chargement");
      }
    } catch (err) {
      console.error("❌ Erreur:", err);
      if (err.code === 'ERR_NETWORK') {
        setError("Impossible de contacter le serveur. Vérifiez que le backend est lancé.");
      } else {
        setError(err.response?.data?.detail || "Impossible de charger les utilisateurs");
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterRole, filterStatus, searchTerm]);

  // Charger les utilisateurs
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchUsers();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm, fetchUsers]);

  // Commencer l'édition
  const handleStartEdit = (user) => {
    setEditingId(user.id);
    setEditFormData({
      nom: user.nom,
      email: user.email,
      role: user.role
    });
  };

  // Annuler l'édition
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ nom: "", email: "", role: "" });
  };

  // Gérer les changements dans le formulaire d'édition
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Sauvegarder les modifications
  const handleSaveEdit = async (userId) => {
    // Validation basique
    if (!editFormData.nom.trim()) {
      alert("Le nom ne peut pas être vide");
      return;
    }
    if (!editFormData.email.trim() || !/\S+@\S+\.\S+/.test(editFormData.email)) {
      alert("Email invalide");
      return;
    }
    if (!editFormData.role) {
      alert("Le rôle est requis");
      return;
    }

    setEditLoading(true);
    
    try {
      // Ne mettre à jour que les champs modifiés
      const originalUser = users.find(u => u.id === userId);
      const updateData = {};
      
      if (editFormData.nom !== originalUser.nom) updateData.nom = editFormData.nom;
      if (editFormData.email !== originalUser.email) updateData.email = editFormData.email;
      if (editFormData.role !== originalUser.role) updateData.role = editFormData.role;
      
      // Si rien n'a changé, on annule simplement l'édition
      if (Object.keys(updateData).length === 0) {
        setEditingId(null);
        setEditLoading(false);
        return;
      }
      
      await axios.put(`${API_BASE_URL}/api/users/${userId}`, updateData);
      
      // Afficher un message de succès temporaire
      setSuccessMessage("Utilisateur mis à jour avec succès");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      // Recharger la liste et quitter le mode édition
      await fetchUsers();
      setEditingId(null);
      
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      alert(err.response?.data?.detail || "Erreur lors de la mise à jour");
    } finally {
      setEditLoading(false);
    }
  };

  // Changer le statut d'un utilisateur
  const handleToggleStatus = async (userId, currentStatus) => {
    setToggleLoading(userId);
    
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const action = newStatus === 1 ? "activé" : "désactivé";
      
      await axios.put(`${API_BASE_URL}/api/users/${userId}`, { 
        status: newStatus 
      });
      
      setSuccessMessage(`Utilisateur ${action} avec succès`);
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchUsers();
      
    } catch (err) {
      console.error("Erreur lors du changement de statut:", err);
      alert("Erreur lors du changement de statut");
    } finally {
      setToggleLoading(null);
    }
  };

  // Supprimer un utilisateur avec confirmation
  const handleDeleteUser = async (userId, userNom) => {
    // Boîte de dialogue de confirmation personnalisée
    const confirmDelete = window.confirm(
      `⚠️ Êtes-vous sûr de vouloir supprimer l'utilisateur "${userNom}" ?\n\nCette action est irréversible.`
    );
    
    if (!confirmDelete) return;
    
    setDeleteLoading(userId);
    
    try {
      await axios.delete(`${API_BASE_URL}/api/users/${userId}`);
      
      setSuccessMessage("Utilisateur supprimé avec succès");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await fetchUsers();
      
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
      alert(err.response?.data?.detail || "Erreur lors de la suppression");
    } finally {
      setDeleteLoading(null);
    }
  };

  // Statistiques
  const stats = {
    totalUsers: totalUsers,
    activeUsers: users.filter(u => u.status === 1).length,
    inactiveUsers: users.filter(u => u.status === 0).length,
    biologists: users.filter(u => u.role === 'biologist').length,
    admins: users.filter(u => u.role === 'admin').length
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Date invalide";
    }
  };

  return (
    <div className="user-management-container">
      <Sidebar />
      
      <div className="main-content">
        {/* Header */}
        <header className="user-header">
          <div className="header-left">
            <h1>Gestion des Utilisateurs</h1>
          </div>
          
          <div className="header-right">
            <FaBell className="notification-icon" />
            <FaCog className="settings-icon" />
            <div className="user-info">
              <span className="user-email">{currentUser?.email || "admin@biocellvision.com"}</span>
              <FaUserCircle className="user-avatar" />
            </div>
          </div>
        </header>

        {/* Message de succès */}
        {successMessage && (
          <div className="success-message">
            <FaCheckCircle /> {successMessage}
          </div>
        )}

        {/* Statistiques rapides */}
        <div className="stats-cards">
          <div className="stat-small-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.totalUsers}</span>
          </div>
          <div className="stat-small-card active">
            <span className="stat-label">Actifs</span>
            <span className="stat-value">{stats.activeUsers}</span>
          </div>
          <div className="stat-small-card inactive">
            <span className="stat-label">Inactifs</span>
            <span className="stat-value">{stats.inactiveUsers}</span>
          </div>
          <div className="stat-small-card biologist">
            <span className="stat-label">Biologistes</span>
            <span className="stat-value">{stats.biologists}</span>
          </div>
          <div className="stat-small-card admin">
            <span className="stat-label">Admins</span>
            <span className="stat-value">{stats.admins}</span>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="search-filter-bar">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="filter-actions">
            <div className="filter-dropdown">
              <FaFilter className="filter-icon" />
              <select 
                value={filterRole} 
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Admin</option>
                <option value="biologist">Biologiste</option>
              </select>
            </div>
            
            <div className="filter-dropdown">
              <FaFilter className="filter-icon" />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
            
            <button className="btn-add" onClick={() => navigate("/gestion-utilisateur/ajouter")}>
              <FaPlus /> Ajouter
            </button>
            
            <button className="btn-refresh" onClick={fetchUsers} title="Actualiser">
              <FaSyncAlt className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="error-message">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Tableau des utilisateurs */}
        <div className="table-container">
          {loading ? (
            <div className="loading-spinner">
              <FaSpinner className="spinner" />
              <p>Chargement des utilisateurs...</p>
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Date de création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user.id} className={editingId === user.id ? "editing-row" : ""}>
                      {/* Colonne Nom - Éditable */}
                      <td>
                        {editingId === user.id ? (
                          <input
                            type="text"
                            name="nom"
                            value={editFormData.nom}
                            onChange={handleEditChange}
                            className="edit-input"
                            placeholder="Nom"
                            disabled={editLoading}
                          />
                        ) : (
                          <span className="user-name">{user.nom}</span>
                        )}
                      </td>
                      
                      {/* Colonne Email - Éditable */}
                      <td>
                        {editingId === user.id ? (
                          <input
                            type="email"
                            name="email"
                            value={editFormData.email}
                            onChange={handleEditChange}
                            className="edit-input"
                            placeholder="Email"
                            disabled={editLoading}
                          />
                        ) : (
                          <span>{user.email}</span>
                        )}
                      </td>
                      
                      {/* Colonne Rôle - Éditable */}
                      <td>
                        {editingId === user.id ? (
                          <select
                            name="role"
                            value={editFormData.role}
                            onChange={handleEditChange}
                            className="edit-select"
                            disabled={editLoading}
                          >
                            <option value="admin">Admin</option>
                            <option value="biologist">Biologiste</option>
                          </select>
                        ) : (
                          <span className={`role-badge ${user.role}`}>
                            {user.role === 'admin' ? 'Admin' : 'Biologiste'}
                          </span>
                        )}
                      </td>
                      
                      {/* Colonne Statut */}
                      <td>
                        <span className={`status-badge ${user.status === 1 ? 'active' : 'inactive'}`}>
                          {user.status === 1 ? (
                            <><FaCheckCircle /> Actif</>
                          ) : (
                            <><FaTimesCircle /> Inactif</>
                          )}
                        </span>
                      </td>
                      
                      {/* Colonne Date */}
                      <td>{formatDate(user.date_creation)}</td>
                      
                      {/* Colonne Actions */}
                      <td className="actions-cell">
                        {editingId === user.id ? (
                          // Actions en mode édition
                          <>
                            <button 
                              className="action-btn save"
                              onClick={() => handleSaveEdit(user.id)}
                              disabled={editLoading}
                              title="Sauvegarder"
                            >
                              {editLoading ? <FaSpinner className="spin" /> : <FaSave />}
                            </button>
                            <button 
                              className="action-btn cancel"
                              onClick={handleCancelEdit}
                              disabled={editLoading}
                              title="Annuler"
                            >
                              <FaBan />
                            </button>
                          </>
                        ) : (
                          // Actions en mode normal
                          <>
                            <button 
                              className="action-btn edit"
                              onClick={() => handleStartEdit(user)}
                              disabled={toggleLoading === user.id || deleteLoading === user.id}
                              title="Modifier"
                            >
                              <FaEdit />
                            </button>
                            
                            <button 
                              className="action-btn toggle"
                              onClick={() => handleToggleStatus(user.id, user.status)}
                              disabled={toggleLoading === user.id || deleteLoading === user.id}
                              title={user.status === 1 ? 'Désactiver' : 'Activer'}
                            >
                              {toggleLoading === user.id ? (
                                <FaSpinner className="spin" />
                              ) : user.status === 1 ? (
                                <FaToggleOn />
                              ) : (
                                <FaToggleOff />
                              )}
                            </button>
                            
                            <button 
                              className="action-btn delete"
                              onClick={() => handleDeleteUser(user.id, user.nom)}
                              disabled={toggleLoading === user.id || deleteLoading === user.id}
                              title="Supprimer"
                            >
                              {deleteLoading === user.id ? (
                                <FaSpinner className="spin" />
                              ) : (
                                <FaTrash />
                              )}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">
                      Aucun utilisateur trouvé
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.max(1, p-1))}
              disabled={currentPage === 1 || loading}
            >
              Précédent
            </button>
            <span className="page-info">
              Page {currentPage} sur {totalPages}
            </span>
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
              disabled={currentPage === totalPages || loading}
            >
              Suivant
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GestionUtilisateur;