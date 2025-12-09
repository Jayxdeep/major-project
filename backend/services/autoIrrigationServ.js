import cron from "node-cron";
import axios from "axios";
import SensorData from "../models/sensorModel.js";
import Irrigation from "../models/irrigationModel.js";
import { publishCommand } from "../utils/mqttClient.js";
import { getWeatherData } from "../utils/weatherApi.js";
console.log(" Auto Irrigation Intelligence Loaded (Hybrid Mode)");
const HYSTERESIS = 3;
const COOLDOWN_MS = 2 * 60 * 1000;      // 2 min
const MAX_ON_DURATION_MS = 20 * 60 * 1000; // 20 min safety
async function callMLService(payload) {
  try {
    const { data } = await axios.post("http://localhost:5000/predict", payload);
    return data?.result;
  } catch (err) {
    console.log("⚠ ML Service not reachable. Proceeding without ML logic.");
    return null;
  }
}
cron.schedule("*/1 * * * *", async () => {
  try {
    const irrigation = await Irrigation.findOne();
    if (!irrigation) return;
    if (irrigation.mode !== "AUTO") return;
    const latest = await SensorData.findOne().sort({ timestamp: -1 });
    if (!latest) return;
    const moisture = parseFloat(latest.moisture.replace(/\D/g, "")) || null;
    if (!moisture && moisture !== 0) return;
    const weather = await getWeatherData();
    const rainChance = weather?.rainChance ?? 0;
    const mlPayload = {
      soil_moisture: moisture,
      rainfall_detected: rainChance > 50 ? 1 : 0,
      temperature: weather?.temperature ?? 25,
      humidity: weather?.humidity ?? 60,
      pressure: 1010
    };
    const mlResult = await callMLService(mlPayload);
    const now = Date.now();
    const lastAction = irrigation.lastCommandAt ? new Date(irrigation.lastCommandAt).getTime() : 0;
    const timeSince = now - lastAction;
    // Rule-based decision
    let ruleDecision = "NO_ACTION";
    if (moisture < irrigation.threshold - HYSTERESIS) {
      ruleDecision = "ON";
    } else if (moisture > irrigation.threshold + HYSTERESIS) {
      ruleDecision = "OFF";
    }
    // Apply Hybrid Logic
    let finalDecision = ruleDecision;
    if (ruleDecision === "NO_ACTION" && mlResult?.irrigate === true) {
      // ML wants irrigation but rules are neutral : allow ML
      finalDecision = "ON";
    }
    if (rainChance >= 50 && moisture > irrigation.threshold - 10) {
      finalDecision = "DELAY";
    }
    if (timeSince < COOLDOWN_MS && finalDecision !== "DELAY") {
      return;
    }
    if (irrigation.status === "ON" && timeSince > MAX_ON_DURATION_MS) {
      finalDecision = "OFF";
      irrigation.history.unshift({
        action: "SAFETY_OFF",
        source: "system",
        reason: "Max run time reached",
        createdAt: new Date()
      });
    }
    if (finalDecision === "ON" && irrigation.status !== "ON") {
      publishCommand({ action: "ON" });
      irrigation.status = "ON";
      irrigation.lastCommandAt = new Date();
      irrigation.history.unshift({
        action: "AUTO_ON",
        source: "system",
        reason: `Moisture ${moisture}% | ML=${mlResult?.irrigate}`,
        createdAt: irrigation.lastCommandAt
      });

      console.log(` AUTO → Irrigation ON | Soil: ${moisture}% | Rain: ${rainChance}%`);
    }

    if (finalDecision === "OFF" && irrigation.status !== "OFF") {
      publishCommand({ action: "OFF" });
      irrigation.status = "OFF";
      irrigation.lastCommandAt = new Date();
      irrigation.history.unshift({
        action: "AUTO_OFF",
        source: "system",
        reason: `Moisture ${moisture}% | ML=${mlResult?.irrigate}`,
        createdAt: irrigation.lastCommandAt
      });

      console.log(`AUTO → Irrigation OFF | Soil: ${moisture}%`);
    }

    if (finalDecision === "DELAY") {
      console.log(`🌧 AUTO → Irrigation Paused (Rain forecast: ${rainChance}%)`);
    }
    if (irrigation.history.length > 50) irrigation.history = irrigation.history.slice(0, 50);

    await irrigation.save();

  } catch (err) {
    console.error(" Automation Error:", err.message);
  }
});
