import dotenv from "dotenv";
dotenv.config();
export const mqttConfig={
    broker: process.env.MQTT_BROKER || "localhost",
    port:process.env.MQTT_PORT || 1883,
    sensortopic:"iot/irrigation/sensor",
    actuatortopic: "iot/irrigation/actuator"
}
console.log("loaded mqtt config:",mqttConfig);