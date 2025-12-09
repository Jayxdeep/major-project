import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js";
import { getAvgMosit } from "../services/dataServices.js";
import { getWeatherData } from "../utils/weatherApi.js";
console.log("mqtt client file loading");
const { broker, port, sensortopic, actuatortopic } = mqttConfig;
console.log(`Connecting to mqtt broker ${broker}:${port}`);
const client = mqtt.connect({
  host: broker,
  port: parseInt(port, 10),
  protocol: "mqtt"
});
export let cacheavgmoist = null;
export let lastavgupdtime = null;
client.on("connect", () => {
  console.log("Connected to mqtt");
  client.subscribe(sensortopic, (err) => {
    if (!err) {
      console.log(`Subscribed → ${sensortopic}`);
    } else {
      console.log("Subscription error:", err);
    }
  });
});
client.on("message", async (topic, message) => {
  console.log(` MQTT => ${topic}: ${message.toString()}`);
  let moistureVal = null;
  let temperature = null;
  let humidity = null;
  try {
    const raw=message.toString().trim();
    // const payload = message.toString();
    try {
      const parsed = JSON.parse(payload);
      if (parsed.moisture !== undefined) moistureVal = Number(parsed.moisture);
      if (parsed.temperature !== undefined) temperature = Number(parsed.temperature);
      if (parsed.humidity !== undefined) humidity = Number(parsed.humidity);
    } catch {
      moistureVal = Number(raw.match(/\d+/)?.[0] || null); // keep digits only
    }
    if (!moistureVal && moistureVal !== 0) {
      console.log(" No valid moisture value found, skipping...");
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
    });
    console.log(` Saved → Moist=${moistureVal}% | Temp= ${temperature}°C | Humidity= ${humidity}%`);
    cacheavgmoist = await getAvgMosit();
    lastavgupdtime = new Date();
    console.log(` Updated Average Moisture: ${cacheavgmoist.toFixed(2)}%`);
  } catch (err) {
    console.error("Error storing sensor data:", err.message);
  }
});
export const publishCommand = (cmd) => {
  client.publish(actuatortopic, JSON.stringify(cmd));
  console.log(`Command Sent →`, cmd);
};
export default client;