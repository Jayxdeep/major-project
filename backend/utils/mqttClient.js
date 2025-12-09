import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js";
import irrigationModel from "../models/irrigationModel.js";
import { getAvgMosit } from "../services/dataServices.js";
import { getWeatherData } from "../utils/weatherApi.js";
import axios from "axios";
import { io } from "../server.js";   //🔥 SOCKET.IO UPDATE

console.log("MQTT Client initializing...");
const { broker, port, sensortopic, actuatortopic } = mqttConfig;

console.log(`Connecting to MQTT Broker: ${broker}:${port}`);

const client = mqtt.connect({
  host: broker,
  port: parseInt(port, 10),
  protocol: "mqtt",
});

export let cacheavgmoist = null;
export let lastavgupdtime = null;

client.on("connect", () => {
  console.log("Connected to MQTT Broker");
  client.subscribe(sensortopic, (err) => {
    if (!err) console.log(`Subscribed to topic: ${sensortopic}`);
    else console.log("Subscription error:", err);
  });
});

client.on("message", async (topic, message) => {
  const raw = message.toString().trim();
  console.log(`MQTT → ${topic}: "${raw}"`);

  let moistureVal = null, temperature = null, humidity = null;

  try {
    // ------------ TRY JSON ------------
    try {
      const parsed = JSON.parse(raw);

      if (typeof parsed === "object") {
        if (parsed.moisture !== undefined) moistureVal = Number(parsed.moisture);
        if (parsed.temperature !== undefined) temperature = Number(parsed.temperature);
        if (parsed.humidity !== undefined) humidity = Number(parsed.humidity);
      } else if (typeof parsed === "number") {
        moistureVal = parsed;
      }

    } catch {
      // ------------ RAW NUMERIC FALLBACK ------------
      const clean = raw.replace(/['"]+/g, "").trim();
      const numeric = Number(clean);

      if (!isNaN(numeric)) moistureVal = numeric;
      else {
        const match = clean.match(/\d+(\.\d+)?/);
        if (match) moistureVal = Number(match[0]);
      }
    }

    // ------- VALIDATION --------
    if (moistureVal === null || isNaN(moistureVal)) return;

    // ------- WEATHER FALLBACK -------
    if (temperature === null || humidity === null) {
      const weather = await getWeatherData();
      temperature = weather?.temperature ?? 0;
      humidity = weather?.humidity ?? 0;
    }

    // ------- SAVE TO DB -------
    await sensorData.create({
      moisture: moistureVal,
      temperature,
      humidity,
    });

    console.log(`Saved → Moist=${moistureVal}% | Temp=${temperature}°C | Humidity=${humidity}%`);

    cacheavgmoist = await getAvgMosit();
    lastavgupdtime = new Date();
    console.log(`Updated Avg Moisture: ${cacheavgmoist.toFixed(2)}%`);

    // 🔥 STREAM LIVE SENSOR UPDATE TO UI --------------------
    io.emit("sensor_update", {
      moisture: moistureVal,
      temperature,
      humidity,
      avgMoisture: cacheavgmoist,
      timestamp: new Date()
    });

    // ------- ML AUTO CONTROL -------
    const irrigState = await irrigationModel.findOne();

    if (irrigState?.mode === "AUTO") {
      console.log("Auto Mode → Predicting using ML...");

      const mlResponse = await axios.post("http://localhost:5000/predict", {
        soil_moisture: moistureVal,
        rainfall_detected: 0,
        temperature,
        humidity,
        pressure: 1010,
      });

      const irrigate = mlResponse.data.irrigate;
      const action = irrigate ? "ON" : "OFF";

      publishCommand({ action });
      console.log(`ML Decision → Pump: ${action}`);

      irrigState.status = action;
      irrigState.lastCmdAt = new Date();
      irrigState.lastAppMoist = moistureVal;

      irrigState.history.unshift({
        action,
        source: "AUTO-ML",
        reason: `ML decided irrigate=${irrigate}`,
        createdAt: new Date(),
      });

      if (irrigState.history.length > 50) irrigState.history.pop();
      irrigState.history = irrigState.history.filter(h =>
        ["ON", "OFF", "MODE_AUTO", "MODE_MANUAL"].includes(h.action)
      );

      await irrigState.save();

      // 🔥 STREAM PUMP STATUS CHANGE --------------------
      io.emit("pump_update", {
        pumpStatus: action,
        decidedBy: "AUTO-ML",
        moisture: moistureVal,
        timestamp: new Date()
      });
    }

  } catch (err) {
    console.error("Error processing MQTT message:", err.message);
  }
});

export const publishCommand = (cmd) => {
  client.publish(actuatortopic, JSON.stringify(cmd));
  console.log(`Pump Command Published →`, cmd);
};

export default client;
