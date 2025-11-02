import React, { useEffect, useState } from "react";
import axios from "axios";
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
import "./App.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

function App() {
  const [data, setData] = useState([]);
  const [avgMoisture, setAvgMoisture] = useState(null);
  const [weather, setWeather] = useState(null);

  const fetchData = async () => {
    try {
      const res = await axios.get("http://localhost:3000/api/sensors");
      setData(res.data);
      if (res.data.length > 0) {
        const avg =
          res.data.reduce((sum, d) => sum + d.moisture, 0) / res.data.length;
        setAvgMoisture(avg.toFixed(2));
      }
    } catch (err) {
      console.error("Error fetching data:", err.message);
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

  useEffect(() => {
    fetchData();
    fetchWeather();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: data.map((d) =>
      new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    ),
    datasets: [
      {
        label: "Moisture (%)",
        data: data.map((d) => d.moisture),
        borderColor: "#2e7d32",
        backgroundColor: "rgba(46, 125, 50, 0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: true, position: "top" },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Moisture (%)" },
      },
      x: {
        title: { display: true, text: "Time" },
      },
    },
  };

  return (
    <div className="app-container">
      <h1>Climate-Adaptive IoT Drip Irrigation Dashboard</h1>
      <p className="subtext">Real-time Monitoring & Smart Control</p>

      <div className="cards-container">
        <div className="info-card">
          <p>
            <strong>Average Moisture:</strong>{" "}
            {avgMoisture ? `${avgMoisture}%` : "Loading..."}
          </p>

          <p
            className="valve-status"
            style={{
              color:
                avgMoisture && avgMoisture < 40
                  ? "red"
                  : avgMoisture
                  ? "#2e7d32"
                  : "gray",
            }}
          >
            Valve Status:{" "}
            {avgMoisture
              ? avgMoisture < 40
                ? "ON (Irrigating...)"
                : "OFF"
              : "Loading..."}
          </p>
        </div>

        {weather && (
          <div className="weather-card">
            <h3>Weather in {weather.city}</h3>
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt="weather-icon"
            />
            <p>Temp: {weather.temp}°C</p>
            <p>Humidity: {weather.humidity}%</p>
            <p>Condition: {weather.condition}</p>
          </div>
        )}
      </div>

      <div className="chart-section">
        <Line data={chartData} options={chartOptions} />
      </div>

      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Moisture (%)</th>
            <th>Temperature (°C)</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((d, i) => (
              <tr key={i}>
                <td>{new Date(d.timestamp).toLocaleString()}</td>
                <td>{d.moisture}</td>
                <td>{d.temperature}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">Loading data...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
