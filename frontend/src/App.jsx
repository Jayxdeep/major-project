import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";
import Profile from "./Profile";

import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler);

import ReactSpeedometer from "react-d3-speedometer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Droplets,
  Wind,
  LayoutDashboard,
  Activity,
  Power,
  Sprout,
  Moon,
  Sun,
  User,
  Cpu,
} from "lucide-react";

import { API } from "./config";
import "./App.css";

// SOCKET CONNECTION
const socket = io(API, {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function App() {
  const [data, setData] = useState([]);
  const [avgMoisture, setAvgMoisture] = useState(null);
  const [weather, setWeather] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [irrigationStatus, setIrrigationStatus] = useState("OFF");
  const [mode, setMode] = useState("MANUAL");
  const [mlHistory, setMlHistory] = useState([]);

  const rowsPerPage = 8;

  // FETCH IRRIGATION STATUS
  const fetchIrrigationStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/irrigation/status`);
      setIrrigationStatus(res.data.status);
      setMode(res.data.mode);
    } catch (err) {
      console.error("Error fetching irrigation status:", err.message);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/history`);

      if (!Array.isArray(res.data)) return setMlHistory([]);

      const normalized = res.data.map((h) => ({
        action: h.action || "UNKNOWN",
        reason: h.reason || "No reason",
        createdAt: h.createdAt ? Number(new Date(h.createdAt)) : Date.now(),
      }));

      setMlHistory(normalized);
    } catch (err) {
      console.log("Error fetching ML history:", err.message);
    }
  };

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/sensors`);
      const normalized = Array.isArray(res.data)
        ? res.data.map((d) => ({
            ...d,
            timestamp: d.timestamp || d.createdAt || Date.now(),
          }))
        : [];
      setData(normalized);
    } catch (err) {
      console.error("Error fetching sensor data:", err.message);
    }
  };

  const fetchAvgMoisture = async () => {
    try {
      const res = await axios.get(`${API}/api/sensors/average`);
      const val = res?.data?.avgMosit;
      setAvgMoisture(typeof val === "number" ? Number(val.toFixed(2)) : null);
    } catch (err) {
      console.error("Error fetching avg moisture:", err.message);
    }
  };

  const fetchWeather = async () => {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?q=Bengaluru&appid=${
        import.meta.env.VITE_WEATHER_API_KEY
      }&units=metric`;

      const res = await axios.get(url);

      setWeather({
        temp: res.data.main.temp,
        humidity: res.data.main.humidity,
        condition: res.data.weather[0].main,
        icon: res.data.weather[0].icon,
        city: res.data.name,
      });
    } catch (err) {
      console.error("Error fetching weather:", err.message);
    }
  };

  const updateMode = async (newMode) => {
    try {
      await axios.post(`${API}/api/irrigation/mode`, { mode: newMode });
      await fetchIrrigationStatus();
    } catch (err) {
      console.error("Failed to update mode:", err.message);
    }
  };

  const controlPump = async (action) => {
    try {
      await axios.post(`${API}/api/irrigation/control`, { action, source: "user" });
      await fetchIrrigationStatus();
    } catch (err) {
      console.error("Failed to control pump:", err.message);
    }
  };

  // SOCKET LISTENERS
  useEffect(() => {
    fetchData();
    fetchAvgMoisture();
    fetchWeather();
    fetchIrrigationStatus();
    fetchHistory();

const onSensor = (payload) => {
  // sanitize moisture
  let m = Number(payload.moisture);
  if (isNaN(m) || m < 0 || m > 100) m = null; // toss corrupted values

  // sanitize temperature
  let t = Number(payload.temperature);
  if (isNaN(t) || t < -20 || t > 80) t = null;

  // sanitize humidity
  let h = Number(payload.humidity);
  if (isNaN(h) || h < 0 || h > 100) h = null;

  // avg moisture must only compute from valid values
  let avgM = typeof payload.avgMoisture === "number"
    ? Number(payload.avgMoisture)
    : null;

  const normalized = {
    moisture: m,
    temperature: t,
    humidity: h,
    avgMoisture: avgM,
    timestamp: Date.now(),
  };

  console.log("SANITIZED SENSOR:", normalized);

  // keep only last 50 readings
  setData((prev) => [...prev.slice(-49), normalized]);

  if (avgM !== null) {
    setAvgMoisture(Number(avgM.toFixed(2)));
  }
};


    const onPump = (payload) => {
      const createdAt = Date.now();

      setIrrigationStatus(payload.pumpStatus);

      setMlHistory((prev) => [
        {
          action: payload.pumpStatus,
          reason: payload.reason || payload.decidedBy || "System",
          createdAt,
        },
        ...prev.slice(0, 49),
      ]);
    };

    socket.on("sensor_update", onSensor);
    socket.on("pump_update", onPump);

    return () => {
      socket.off("sensor_update", onSensor);
      socket.off("pump_update", onPump);
    };
  }, []);

  // CHART DATA
  const chartData = {
    labels: data.map((d) =>
      new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    ),
    datasets: [
      {
        label: "Soil Moisture (%)",
        data: data.map((d) => Number(d.moisture)),
        borderColor: "#4ade80",
        backgroundColor: "rgba(74, 222, 128, 0.2)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
      {
        label: "Temperature (°C)",
        data: data.map((d) => Number(d.temperature)),
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 2,
      },
    ],
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false };

  const indexOfLast = rowsPerPage;
  const currentRows = data.slice(-rowsPerPage);

  return (
    <div className={`app-wrapper ${darkMode ? "dark-theme" : "light-theme"}`}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-container">
          <Sprout size={32} className="logo-icon" />
          <h2 className="logo-text">
            Agri<span className="highlight">Tech</span>
          </h2>
        </div>

        <nav>
          <button
            className={`nav-item ${currentPage === "profile" ? "active" : ""}`}
            onClick={() => setCurrentPage("profile")}
          >
            <User size={24} />
            <span className="nav-text">Profile</span>
          </button>

          <button
            className={`nav-item ${currentPage === "dashboard" ? "active" : ""}`}
            onClick={() => setCurrentPage("dashboard")}
          >
            <LayoutDashboard size={24} />
            <span className="nav-text">Dashboard</span>
          </button>
        </nav>

        <div className="bottom-toggle">
          <button className="theme-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT SWITCH */}
      <main className="main-content">
        {/* ----------- PROFILE PAGE ----------- */}
        {currentPage === "profile" && <Profile />}

        {/* ----------- DASHBOARD PAGE ----------- */}
        {currentPage === "dashboard" && (
          <>
            <header className="top-header">
              <div className="header-text">
                <h1>Farm Monitoring</h1>
                <p>Live IoT Data Stream • {new Date().toLocaleDateString()}</p>
              </div>

              <div className="control-widget glass-panel">
                <div className="status-indicator">
                  <span className={`dot ${irrigationStatus === "ON" ? "active" : ""}`} />
                  <span>
                    Pump: <strong>{irrigationStatus}</strong>
                  </span>
                </div>

                <div className="toggle-group">
                  <button
                    className={`mode-btn ${mode === "AUTO" ? "selected" : ""}`}
                    onClick={() => updateMode("AUTO")}
                  >
                    Auto
                  </button>

                  <button
                    className={`mode-btn ${mode === "MANUAL" ? "selected" : ""}`}
                    onClick={() => updateMode("MANUAL")}
                  >
                    Manual
                  </button>
                </div>

                <AnimatePresence>
                  {mode === "MANUAL" && (
                    <motion.div className="manual-controls">
                      <button className="power-btn on" onClick={() => controlPump("ON")}>
                        <Power size={14} /> ON
                      </button>
                      <button className="power-btn off" onClick={() => controlPump("OFF")}>
                        <Power size={14} /> OFF
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </header>

            {/* GRID */}
            <div className="dashboard-grid">
              {/* LEFT SIDE */}
              <div className="stats-column">
                <motion.div className="stat-card glass-panel moisture">
                  <div className="card-icon green">
                    <Leaf size={24} />
                  </div>
                  <div>
                    <h3>Avg Moisture</h3>
                    <div className="big-number">
                      {avgMoisture !== null ? `${avgMoisture}%` : "--"}
                    </div>
                    <div
                      className={`status-badge ${Number(avgMoisture) < 40 ? "warning" : "good"}`}
                    >
                      {Number(avgMoisture) < 40 ? "Needs Water" : "Optimal"}
                    </div>
                  </div>
                </motion.div>

                {weather && (
                  <motion.div className="stat-card glass-panel weather">
                    <div className="weather-flex">
                      <img
                        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                        className="weather-img"
                      />
                      <div>
                        <h3>{weather.city}</h3>
                        <div className="big-number">{Math.round(weather.temp)}°C</div>
                        <p className="sub-detail">{weather.condition}</p>
                      </div>
                    </div>
                    <div className="weather-grid">
                      <div className="mini-stat">
                        <Droplets size={14} /> {weather.humidity}%
                      </div>
                      <div className="mini-stat">
                        <Wind size={14} /> Low Wind
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="stat-card glass-panel gauge-container">
                  <h3>Live Sensor</h3>
                  <ReactSpeedometer maxValue={100} value={avgMoisture || 0} segments={5} />
                  <div className="gauge-value">{avgMoisture || 0}%</div>
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="analytics-column">
                {/* CHART */}
                <div className="chart-card glass-panel">
                  <div className="card-header">
                    <h3>
                      <Activity size={18} /> Moisture vs Temperature Trends
                    </h3>
                  </div>
                  <div className="chart-wrapper">
                    <Line key={data.length} data={chartData} options={chartOptions} />
                  </div>
                </div>

                {/* AI IRRIGATION DECISION TABLE */}
                <AnimatePresence>
                  {mode === "AUTO" && (
                    <motion.div
                      className="table-card glass-panel"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="card-header">
                        <h3>
                          <Cpu size={18} /> AI Irrigation Decisions
                        </h3>
                      </div>

                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Decision</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mlHistory.slice(0, 8).map((h) => (
                              <tr key={h.createdAt}>
                                <td>{new Date(h.createdAt).toLocaleTimeString()}</td>
                                <td>{h.action}</td>
                                <td>{h.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* RECENT DATA */}
                <div className="table-card glass-panel">
                  <div className="card-header">
                    <h3>Recent Readings</h3>
                  </div>

                  <div className="table-responsive">
                    <table>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Moisture</th>
                          <th>Temp</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentRows.map((d) => (
                          <tr key={d.timestamp}>
                            <td>{new Date(d.timestamp).toLocaleTimeString()}</td>
                            <td>{d.moisture}%</td>
                            <td>{d.temperature}°C</td>
                            <td>
                              <span className={`dot ${d.moisture < 40 ? "red" : "green"}`}></span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
