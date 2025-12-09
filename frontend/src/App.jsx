import React, { useEffect, useState } from "react";
import axios from "axios";
import io from "socket.io-client";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import ReactSpeedometer from "react-d3-speedometer";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Droplets,
  Thermometer,
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

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

// Socket connection outside component to avoid reconnections
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
  const [currentPage, setCurrentPage] = useState(1);
  const [irrigationStatus, setIrrigationStatus] = useState(null);
  const [mode, setMode] = useState("auto");
  const [mlHistory, setMlHistory] = useState([]);

  const rowsPerPage = 8;

  // Fetch Data
  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/api/sensors`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching data:", err.message);
    }
  };

  const fetchAvgMoisture = async () => {
    try {
      const res = await axios.get(`${API}/api/sensors/average`);
      setAvgMoisture(res.data.avgMosit?.toFixed(2) || null);
    } catch (err) {
      console.error("Error fetching avg moisture:", err.message);
    }
  };

  const fetchWeather = async () => {
    try {
      const city = "Bengaluru";
      const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
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

  const fetchIrrigationStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/irrigation/status`);
      setIrrigationStatus(res.data.status);
      setMode(res.data.mode);
    } catch (err) {
      console.log("Error fetching irrigation status:", err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API}/api/history`);
      setMlHistory(res.data);
    } catch (err) {
      console.log("Error fetching ML history:", err);
    }
  };

  // Controls
  const updateMode = async (newMode) => {
    try {
      await axios.post(`${API}/api/irrigation/mode`, { mode: newMode });
      fetchIrrigationStatus();
    } catch (err) {
      console.error(err);
    }
  };

  const controlPump = async (action) => {
    try {
      await axios.post(`${API}/api/irrigation/control`, {
        action,
        triggeredBy: "user",
      });
      fetchIrrigationStatus();
    } catch (err) {
      console.error(err);
    }
  };

  // Initial Load + Socket Setup
  useEffect(() => {
    // Initial data fetch
    fetchData();
    fetchAvgMoisture();
    fetchWeather();
    fetchIrrigationStatus();
    fetchHistory();

    // Socket.IO Real-time Updates
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    // Listen for new sensor data
    socket.on("sensor_update", (payload) => {
      console.log("📡 Live sensor update:", payload);
      
      // Add new data point to the chart
      setData((prev) => {
        const newData = [...prev, payload];
        // Keep only last 50 readings for performance
        return newData.slice(-50);
      });
      
      // Update average moisture if provided
      if (payload.avgMoisture !== undefined) {
        setAvgMoisture(payload.avgMoisture.toFixed(2));
      }
    });

    // Listen for pump status changes
    socket.on("pump_update", (payload) => {
      console.log("🔄 Pump status update:", payload);
      
      setIrrigationStatus(payload.pumpStatus);
      
      // Add to ML history
      setMlHistory((prev) => [
        {
          action: payload.pumpStatus,
          reason: payload.decidedBy || "System decision",
          createdAt: new Date(),
        },
        ...prev.slice(0, 49), // Keep last 50 entries
      ]);
    });

    // Fallback polling (in case socket fails)
    const pollInterval = setInterval(() => {
      if (!socket.connected) {
        console.log("⚠️ Socket disconnected, using polling fallback");
        fetchData();
        fetchAvgMoisture();
        fetchHistory();
      }
    }, 10000); // Poll every 10 seconds only if socket is down

    // Cleanup
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensor_update");
      socket.off("pump_update");
      clearInterval(pollInterval);
    };
  }, []);

  // Chart Data
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: darkMode ? "#e2e8f0" : "#1e293b" } },
    },
    scales: {
      y: {
        ticks: { color: darkMode ? "#94a3b8" : "#64748b" },
        grid: { color: darkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" },
      },
      x: {
        ticks: { color: darkMode ? "#94a3b8" : "#64748b" },
        grid: { display: false },
      },
    },
  };

  // Pagination
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const currentRows = data.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(data.length / rowsPerPage);

  return (
    <div className={`app-wrapper ${darkMode ? "dark-theme" : "light-theme"}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <Sprout size={32} className="logo-icon" />
          <h2 className="logo-text">Agri<span className="highlight">Tech</span></h2>
        </div>

        <nav>
          <button className="nav-item">
            <User size={24} />
            <span className="nav-text">Profile</span>
          </button>
          <button className="nav-item active">
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

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-text">
            <h1>Farm Monitoring</h1>
            <p>Live IoT Data Stream • {new Date().toLocaleDateString()}</p>
          </div>

          <div className="control-widget glass-panel">
            <div className="status-indicator">
              <span className={`dot ${irrigationStatus === "ON" ? "active" : ""}`} />
              <span>Pump: <strong>{irrigationStatus || "Offline"}</strong></span>
            </div>

            <div className="toggle-group">
              <button className={`mode-btn ${mode === "AUTO" ? "selected" : ""}`} onClick={() => updateMode("AUTO")}>Auto</button>
              <button className={`mode-btn ${mode === "MANUAL" ? "selected" : ""}`} onClick={() => updateMode("MANUAL")}>Manual</button>
            </div>

            <AnimatePresence>
              {mode === "MANUAL" && (
                <motion.div className="manual-controls">
                  <button className="power-btn on" onClick={() => controlPump("ON")}><Power size={14} /> ON</button>
                  <button className="power-btn off" onClick={() => controlPump("OFF")}><Power size={14} /> OFF</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* GRID */}
        <div className="dashboard-grid">
          {/* LEFT */}
          <div className="stats-column">
            <motion.div whileHover={{ y: -5 }} className="stat-card glass-panel moisture">
              <div className="card-icon green"><Leaf size={24} /></div>
              <div>
                <h3>Avg Moisture</h3>
                <div className="big-number">{avgMoisture || "--"}%</div>
                <div className={`status-badge ${avgMoisture < 40 ? "warning" : "good"}`}>
                  {avgMoisture < 40 ? "Needs Water" : "Optimal"}
                </div>
              </div>
            </motion.div>

            {weather && (
              <motion.div whileHover={{ y: -5 }} className="stat-card glass-panel weather">
                <div className="weather-flex">
                  <img src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} className="weather-img" />
                  <div>
                    <h3>{weather.city}</h3>
                    <div className="big-number">{Math.round(weather.temp)}°C</div>
                    <p className="sub-detail">{weather.condition}</p>
                  </div>
                </div>
                <div className="weather-grid">
                  <div className="mini-stat"><Droplets size={14}/> {weather.humidity}%</div>
                  <div className="mini-stat"><Wind size={14}/> Low Wind</div>
                </div>
              </motion.div>
            )}

            <div className="stat-card glass-panel gauge-container">
              <h3>Live Sensor</h3>
              <ReactSpeedometer maxValue={100} value={avgMoisture || 0} segments={5} />
              <div className="gauge-value">{avgMoisture || 0}%</div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="analytics-column">
            {/* Chart */}
            <div className="chart-card glass-panel">
              <div className="card-header">
                <h3><Activity size={18} /> Moisture vs Temperature Trends</h3>
              </div>
              <div className="chart-wrapper">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>

            {/* --- ML Decision Table --- */}
            <div className="table-card glass-panel">
              <div className="card-header">
                <h3><Cpu size={18}/> AI Irrigation Decisions</h3>
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
                    {mlHistory.slice(0, 8).map((h, i) => (
                      <tr key={i}>
                        <td>{new Date(h.createdAt).toLocaleTimeString()}</td>
                        <td>{h.action}</td>
                        <td>{h.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Data */}
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
                    {currentRows.map((d, i) => (
                      <tr key={i}>
                        <td>{new Date(d.timestamp).toLocaleTimeString()}</td>
                        <td>{d.moisture}%</td>
                        <td>{d.temperature}°C</td>
                        <td><span className={`dot ${d.moisture < 40 ? "red" : "green"}`}></span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>←</button>
                <span>Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>→</button>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}

export default App;