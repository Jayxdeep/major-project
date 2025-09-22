import mqtt from "mqtt"; //testing server [due to some issues need to reroute the systems]

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
    console.log("Connected to MQTT test broker");
    client.subscribe("iot/irrigation/sensor");
    client.publish("iot/irrigation/sensor", "Hello from test");
});

client.on("message", (topic, message) => {
    console.log(`Received: ${topic} -> ${message.toString()}`);
});
