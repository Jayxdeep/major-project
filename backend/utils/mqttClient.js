import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js";
import irrigationModel from "../models/irrigationModel.js";
import { getAvgMosit } from "../services/dataServices.js";
import { getWeatherData } from "../utils/weatherApi.js";
import axios from "axios";
import { io } from "../server.js";   
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

  let moistureVal = null;
  let temperature = null;
  let humidity = null;

  try {
    // ---- STRICT SANITIZATION ----
    // 1. Try JSON parse
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
      // 2. Extract ONLY pure numbers
      const numeric = Number(raw.replace(/[^\d.]/g, ""));
      if (!isNaN(numeric)) moistureVal = numeric;
    }

    // ---- VALIDATION ----  
    if (moistureVal === null || isNaN(moistureVal)) {
      console.log("❌ Invalid moisture → ignored:", raw);
      return;
    }

    if (moistureVal < 0 || moistureVal > 100) {
      console.log("❌ Moisture outside valid range → ignored:", moistureVal);
      return;
    }

    // ---- TEMPERATURE + HUMIDITY ----
    // If missing → pull from weather API
    if (temperature === null || humidity === null) {
      const weather = await getWeatherData();
      temperature = weather?.temperature ?? null;
      humidity = weather?.humidity ?? null;
    }

    // ---- SAVE CLEAN DATA ----
    await sensorData.create({
      moisture: moistureVal,
      temperature,
      humidity,
      timestamp: new Date()
    });

    console.log(`Saved → Moist=${moistureVal}% | Temp=${temperature}°C | Humidity=${humidity}%`);

    // ---- UPDATE AVG ----
    cacheavgmoist = await getAvgMosit();
    lastavgupdtime = new Date();

    console.log(`Updated Avg Moisture: ${cacheavgmoist.toFixed(2)}%`);

    // ---- SEND TO FRONTEND ----
    io.emit("sensor_update", {
      moisture: moistureVal,
      temperature,
      humidity,
      avgMoisture: cacheavgmoist,
      timestamp: new Date()
    });

    // ---- IRRIGATION MODE LOGIC ----
    const irrigState = await irrigationModel.findOne();

    if (!irrigState) return;

    // Manual mode → skip ML
    if (irrigState.mode === "MANUAL") {
      console.log("MANUAL MODE → ML skipped");
      irrigState.lastAppMoist = moistureVal;
      await irrigState.save();
      return;
    }

    // Auto mode → Predict
    if (irrigState.mode === "AUTO") {
      console.log("AUTO MODE → Predicting using ML...");

      let mlResponse;
      try {
        mlResponse = await axios.post("http://localhost:5000/predict", {
          soil_moisture: moistureVal,
          rainfall_detected: 0,
          temperature,
          humidity,
          pressure: 1010,
        });
      } catch (err) {
        console.log("ML ERROR:", err.message);
        return;
      }

      const irrigate = mlResponse.data.irrigate;
      const action = irrigate ? "ON" : "OFF";

      publishCommand({ action });

      irrigState.status = action;
      irrigState.lastCmdAt = new Date();
      irrigState.lastAppMoist = moistureVal;

      irrigState.history.unshift({
        action,
        source: "AUTO-ML",
        reason: `ML decided irrigate=${irrigate}`,
        createdAt: new Date()
      });

      if (irrigState.history.length > 50) irrigState.history.pop();
      await irrigState.save();

      io.emit("pump_update", {
        pumpStatus: action,
        decidedBy: "AUTO-ML",
        moisture: moistureVal,
        timestamp: new Date()
      });
    }
  } catch (err) {
    console.error("MQTT ERROR:", err.message);
  }
});

export const publishCommand = (cmd) => {
  client.publish(actuatortopic, JSON.stringify(cmd));
  console.log(`Pump Command Published →`, cmd);
};
export default client;