import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js";
import irrigationModel from "../models/irrigationModel.js";
import { getAvgMosit } from "../services/dataServices.js";
import { getWeatherData } from "../utils/weatherAPI.js";
import axios from "axios";
import { io } from "../server.js";
console.log("MQTT Client initializing...");
const { broker, port, sensortopic, actuatortopic } = mqttConfig;
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
  let soil1 = null;
  let soil2 = null;
  try {
    try {
      const parsed = JSON.parse(raw);
      soil1 = parsed.soil1;
      soil2 = parsed.soil2;
      // If Pi explicitly sends moisture=null → both sensors missing
      if (parsed.moisture === null) {
        console.log("Soil sensors missing → skipping & alerting.");

        io.emit("sensor_missing", {
          message: "Both soil sensors not inserted or disconnected!",
          timestamp: new Date(),
        });

        return; // stop here
      }
      if (parsed.moisture !== undefined) moistureVal = Number(parsed.moisture);
      if (parsed.temperature !== undefined) temperature = Number(parsed.temperature);
      if (parsed.humidity !== undefined) humidity = Number(parsed.humidity);
    } catch {
      const numeric = Number(raw.replace(/[^\d.]/g, ""));
      if (!isNaN(numeric)) moistureVal = numeric;
    }
    if (soil1 === 1 && soil2 === 1) {
      console.log("BOTH soil sensors show DRY → likely OUTSIDE soil.");
      io.emit("sensor_missing", {
        message: "Both soil sensors dry/unreliable — check insertion.",
        soil1,
        soil2,
        timestamp: new Date(),
      });

      return; // do not save or update avg
    }
    if (moistureVal === null || isNaN(moistureVal)) {
      console.log("Invalid moisture → ignored");
      return;
    }
    if (moistureVal < 5 || moistureVal > 95) {
      console.log(`Unreliable moisture value (${moistureVal}) — skip`);
      io.emit("sensor_missing", {
        message: "Unreliable moisture reading — sensor contact weak.",
        moisture: moistureVal,
        timestamp: new Date(),
      });

      return;
    }
    if (temperature === null || humidity === null) {
      const weather = await getWeatherData();
      temperature = weather?.temperature ?? null;
      humidity = weather?.humidity ?? null;
    }
    await sensorData.create({
      moisture: moistureVal,
      temperature,
      humidity,
      soil1,
      soil2,
      timestamp: new Date(),
    });

    console.log(
      `Saved → Moist=${moistureVal}% | Temp=${temperature}°C | Humidity=${humidity}%`
    );
    cacheavgmoist = await getAvgMosit();
    lastavgupdtime = new Date();

    io.emit("sensor_update", {
      moisture: moistureVal,
      temperature,
      humidity,
      soil1,
      soil2,
      avgMoisture: cacheavgmoist,
      timestamp: new Date(),
    });
    if (moistureVal >= 75) {
      io.emit("moisture_alert", {
        level: "HIGH",
        moisture: moistureVal,
        message: "Soil moisture crossed safe threshold!",
        timestamp: new Date(),
      });
    }
    const irrigState = await irrigationModel.findOne();
    if (!irrigState) return;

    // MANUAL MODE
    if (irrigState.mode === "MANUAL") {
      irrigState.lastAppMoist = moistureVal;
      await irrigState.save();
      console.log("MANUAL MODE → skipping ML");
      return;
    }

    // AUTO MODE
    if (irrigState.mode === "AUTO") {
      console.log("AUTO MODE → ML deciding...");

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
        createdAt: new Date(),
      });

      if (irrigState.history.length > 50) irrigState.history.pop();
      await irrigState.save();

      io.emit("pump_update", {
        pumpStatus: action,
        decidedBy: "AUTO-ML",
        moisture: moistureVal,
        timestamp: new Date(),
      });
    }

  } catch (err) {
    console.error("MQTT ERROR:", err.message);
  }
});
export const publishCommand = (cmd) => {
  client.publish(actuatortopic, JSON.stringify(cmd));
  console.log("Pump Command Published →", cmd);
};

export default client;