import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserCircle,
  FaUsers,
  FaFlask,
  FaChartLine,
  FaCheckCircle,
  FaHourglassHalf,
  FaCalendarDay,
  FaBell,
  FaCog,
  FaTimesCircle,
  FaFileAlt,
  FaExclamationTriangle,
  FaSyncAlt,
} from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

import Sidebar from "../Sidebar/Sidebar";
import apiClient from "../../../../config/apiClient";
import "./dashboardAdmin.css";

const COLORS = ["#1E8F47", "#2DBE60", "#A8E6C1", "#F59E0B", "#BB1F1F"];

const emptyDashboard = {
  stats: {
    total_users: 0,
    active_biologists: 0,
    total_analyses: 0,
    analyses_today: 0,
    pending_analyses: 0,
    validated_analyses: 0,
    rejected_analyses: 0,
    abnormal_analyses: 0,
    generated_reports: 0,
  },
  charts: {
    analyses_by_status: [],
    analyses_by_type: [],
    analyses_last_7_days: [],
    anomaly_distribution: [],
    top_biologists: [],
  },
  recent_analyses: [],
};

const normalizeChartData = (data = []) =>
  Array.isArray(data)
    ? data.map((item) => ({
        label: item.label || "N/A",
        value: Number(item.value || 0),
      }))
    : [];

const hasChartData = (data = []) =>
  Array.isArray(data) && data.some((item) => Number(item.value) > 0);

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "N/A"
    : date.toLocaleDateString("fr-FR");
};

const formatValidation = (status) => {
  if (status === "validated") return "Validée";
  if (status === "rejected") return "Rejetée";
  return "En attente";
};

const EmptyChart = () => (
  <div className="empty-chart">
    <FaChartLine />
    <p>Aucune donnée disponible</p>
  </div>
);

const DashboardAdmin = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      const response = await apiClient.get("/api/admin/dashboard/stats");
      const charts = response.data.charts || {};

      setDashboard({
        stats: response.data.stats || emptyDashboard.stats,
        charts: {
          analyses_by_status: normalizeChartData(charts.analyses_by_status),
          analyses_by_type: normalizeChartData(charts.analyses_by_type),
          analyses_last_7_days: normalizeChartData(charts.analyses_last_7_days),
          anomaly_distribution: normalizeChartData(charts.anomaly_distribution),
          top_biologists: normalizeChartData(charts.top_biologists),
        },
        recent_analyses: response.data.recent_analyses || [],
      });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Erreur lors du chargement du dashboard admin."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      navigate("/");
      return;
    }

    const parsedUser = JSON.parse(storedUser);

    if (parsedUser.role !== "admin") {
      navigate("/");
      return;
    }

    setUser(parsedUser);
    fetchDashboard(false);
  }, [navigate, fetchDashboard]);

  const stats = dashboard.stats;

  const statCards = useMemo(
    () => [
      {
        icon: FaUsers,
        title: "Total utilisateurs",
        value: stats.total_users,
        description: "Tous les comptes enregistrés",
        color: "primary",
      },
      {
        icon: FaFlask,
        title: "Biologistes actifs",
        value: stats.active_biologists,
        description: "Comptes biologistes activés",
        color: "success",
      },
      {
        icon: FaChartLine,
        title: "Analyses totales",
        value: stats.total_analyses,
        description: "Toutes les analyses créées",
        color: "warning",
      },
      {
        icon: FaCalendarDay,
        title: "Analyses aujourd’hui",
        value: stats.analyses_today,
        description: "Activité du jour",
        color: "blue",
      },
      {
        icon: FaHourglassHalf,
        title: "En attente",
        value: stats.pending_analyses,
        description: "Résultats non encore validés",
        color: "orange",
      },
      {
        icon: FaCheckCircle,
        title: "Validées",
        value: stats.validated_analyses,
        description: "Analyses validées",
        color: "green",
      },
      {
        icon: FaTimesCircle,
        title: "Rejetées",
        value: stats.rejected_analyses,
        description: "Analyses rejetées",
        color: "red",
      },
      {
        icon: FaExclamationTriangle,
        title: "Anormales",
        value: stats.abnormal_analyses,
        description: "Résultats détectés anormaux",
        color: "danger",
      },
      {
        icon: FaFileAlt,
        title: "Rapports générés",
        value: stats.generated_reports,
        description: "Rapports PDF disponibles",
        color: "dark",
      },
    ],
    [stats]
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="main-content">
          <div className="dashboard-loading">
            <FaSyncAlt className="spin" />
            <h2>Chargement du dashboard...</h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Dashboard Admin</h1>
            <p>Vue globale des utilisateurs, analyses, résultats et rapports.</p>
          </div>

          <div className="header-right">
            <button
              type="button"
              className="refresh-btn"
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
            >
              <FaSyncAlt className={refreshing ? "spin" : ""} />
              {refreshing ? "Actualisation..." : "Actualiser"}
            </button>

            <FaBell className="notification-icon" />
            <FaCog className="settings-icon" />

            <div className="user-info">
              <span className="user-email">
                {user?.email || "admin@biocellvision.com"}
              </span>
              <FaUserCircle className="user-avatar" />
            </div>
          </div>
        </header>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="welcome-section">
          <FaUserCircle className="welcome-icon" />
          <div>
            <h2>Bienvenue Admin</h2>
            <p>Données récupérées directement depuis le backend BioCellVision.</p>
          </div>
        </section>

        <section className="stats-grid">
          {statCards.map((card, index) => {
            const Icon = card.icon;

            return (
              <article key={index} className={`stat-card ${card.color}`}>
                <div className="stat-icon">
                  <Icon />
                </div>

                <div className="stat-content">
                  <h3>{card.title}</h3>
                  <p className="stat-number">{card.value}</p>
                  <span>{card.description}</span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="charts-grid">
          <article className="chart-card large">
            <div className="chart-header">
              <h3>Évolution des analyses - 7 derniers jours</h3>
              <p>Nombre d’analyses créées par jour.</p>
            </div>

            {hasChartData(dashboard.charts.analyses_last_7_days) ? (
              <div className="chart-box">
                <ResponsiveContainer width={320} height={320}>
                  <LineChart data={dashboard.charts.analyses_last_7_days}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Analyses"
                      stroke="#1E8F47"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </article>

          <article className="chart-card">
            <div className="chart-header">
              <h3>Statut des analyses</h3>
              <p>Répartition validation/rejet/attente.</p>
            </div>

            {hasChartData(dashboard.charts.analyses_by_status) ? (
              <div className="chart-box">
                <ResponsiveContainer width={320} height={320}>
                  <PieChart>
                    <Pie
                      data={dashboard.charts.analyses_by_status}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {dashboard.charts.analyses_by_status.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </article>

          <article className="chart-card">
            <div className="chart-header">
              <h3>Analyses par type</h3>
              <p>Hématologie, spermogramme, immunofluorescent...</p>
            </div>

            {hasChartData(dashboard.charts.analyses_by_type) ? (
              <div className="chart-box">
                <ResponsiveContainer width={320} height={320}>
                  <BarChart data={dashboard.charts.analyses_by_type}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Analyses"
                      fill="#2DBE60"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </article>

          <article className="chart-card">
            <div className="chart-header">
              <h3>Distribution normal/anormal</h3>
              <p>Résultats IA selon l’état global.</p>
            </div>

            {hasChartData(dashboard.charts.anomaly_distribution) ? (
              <div className="chart-box">
                <ResponsiveContainer width={320} height={320}>
                  <PieChart>
                    <Pie
                      data={dashboard.charts.anomaly_distribution}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      label
                    >
                      {dashboard.charts.anomaly_distribution.map((_, index) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </article>

          <article className="chart-card">
            <div className="chart-header">
              <h3>Top biologistes</h3>
              <p>Classement par nombre d’analyses.</p>
            </div>

            {hasChartData(dashboard.charts.top_biologists) ? (
              <div className="chart-box">
                <ResponsiveContainer width={320} height={320}>
                  <BarChart data={dashboard.charts.top_biologists}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="value"
                      name="Analyses"
                      fill="#1E8F47"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChart />
            )}
          </article>
        </section>

        <section className="recent-card">
          <div className="recent-header">
            <h3>Analyses récentes</h3>
            <span>{dashboard.recent_analyses.length} élément(s)</span>
          </div>

          <div className="recent-table-wrapper">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Biologiste</th>
                  <th>État IA</th>
                  <th>Décision</th>
                  <th>Confiance</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {dashboard.recent_analyses.length > 0 ? (
                  dashboard.recent_analyses.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>{item.client_name}</td>
                      <td>{item.analysis_type}</td>
                      <td>{item.biologist_name}</td>
                      <td>
                        <span
                          className={`state-badge ${
                            item.global_state === "Anormale"
                              ? "danger"
                              : "success"
                          }`}
                        >
                          {item.global_state}
                        </span>
                      </td>
                      <td>{formatValidation(item.validation_status)}</td>
                      <td>
                        {item.confidence !== null &&
                        item.confidence !== undefined
                          ? `${item.confidence}%`
                          : "N/A"}
                      </td>
                      <td>{formatDate(item.created_at)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-row">
                      Aucune analyse récente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DashboardAdmin;