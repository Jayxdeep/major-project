import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js";
import irrigationModel from "../models/irrigationModel.js";
import { getAvgMosit } from "../services/dataServices.js";
import { getWeatherData } from "../utils/weatherApi.js";
import axios from "axios";
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
  console.log(`MQTT → ${topic}: "${raw}" (length: ${raw.length})`);
  let moistureVal = null, temperature = null, humidity = null;
  try {
    try {
      const parsed = JSON.parse(raw);
      console.log("Parsed as JSON:", parsed);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.moisture !== undefined) moistureVal = Number(parsed.moisture);
        if (parsed.temperature !== undefined) temperature = Number(parsed.temperature);
        if (parsed.humidity !== undefined) humidity = Number(parsed.humidity);
      } 
      else if (typeof parsed === 'number') {
        moistureVal = parsed;
        console.log(`Direct numeric JSON: ${moistureVal}`);
      }
    } catch (jsonErr) {
      console.log(" Not JSON, trying numeric extraction...");
      const clean = raw.replace(/^["']|["']$/g, "").trim();
      console.log(`Cleaned value: "${clean}"`);
      const numVal = Number(clean);
      if (!isNaN(numVal) && clean !== "") {
        moistureVal = numVal;
        console.log(`Extracted moisture: ${moistureVal}`);
      } else {
        const match = clean.match(/\d+(\.\d+)?/);
        if (match) {
          moistureVal = Number(match[0]);
          console.log(`Regex extracted moisture: ${moistureVal}`);
        } else {
          console.log(`No numeric value found in: "${clean}"`);
        }
      }
    }
    if (moistureVal === null || isNaN(moistureVal)) {
      console.log(`Skipped → Invalid moisture reading: "${raw}"`);
      return;
    }
    if (temperature === null || humidity === null) {
      const weather = await getWeatherData();
      temperature = weather?.temperature ?? 0;
      humidity = weather?.humidity ?? 0;
    }
    await sensorData.create({
      moisture: moistureVal,
      temperature,
      humidity,
    });
    console.log(`Saved → Moist=${moistureVal}% | Temp=${temperature}°C | Humidity=${humidity}%`);
    cacheavgmoist = await getAvgMosit();
    lastavgupdtime = new Date();
    console.log(`Updated Avg Moisture: ${cacheavgmoist.toFixed(2)}%`);
    const irrigState = await irrigationModel.findOne();
    if (irrigState?.mode === "AUTO") {
      console.log("Auto Mode → Evaluating ML Decision...");

      const mlPayload = {
        soil_moisture: moistureVal,
        rainfall_detected: 0,
        temperature,
        humidity,
        pressure: 1010,
      };
      console.log(`Sending ML Request → http://localhost:5000/predict`);
      const mlResponse = await axios.post("http://localhost:5000/predict", mlPayload);
      const mlResult = mlResponse.data;
      const action = mlResult.irrigate ? "ON" : "OFF";
      publishCommand({ action });
      console.log(`ML Decision → Pump: ${action}`);
      irrigState.status = action;
      irrigState.lastCmdAt = new Date();
      irrigState.lastAppMoist = moistureVal;

      irrigState.history.unshift({
        action: action, // "ON" or "OFF" matches enum
        source: "AUTO-ML",
        reason: `ML decided irrigate=${mlResult.irrigate}`,
        createdAt: new Date(),
      });
      if (irrigState.history.length > 50) irrigState.history.pop();
      irrigState.history = irrigState.history.filter(h => 
        ['ON', 'OFF', 'MODE_AUTO', 'MODE_MANUAL'].includes(h.action)
      );
      await irrigState.save();
    }
  } catch (err) {
    console.error(" Error processing MQTT message:", err.message);
    console.error("Stack:", err.stack);
  }
});
export const publishCommand = (cmd) => {
  client.publish(actuatortopic, JSON.stringify(cmd));
  console.log(`Pump Command Published →`, cmd);
};
export default client;