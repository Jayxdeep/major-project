import mqtt from "mqtt";
import { mqttConfig } from "../config/mqttConfig.js";
import sensorData from "../models/sensorModel.js"
console.log("mqtt client file loading")
const {broker,port,sensortopic,actuatortopic}=mqttConfig;
console.log(`Connecting to mqtt broker${broker}:${port}`); //here the broker is being connected to mqtt protocol
const client=mqtt.connect({
    host:broker,
    port:parseInt(port,10),
    protocol:"mqtt"
});
client.on("connect",()=>{
    console.log("Connected to mqtt");
    client.subscribe(sensortopic,(err)=>{//subscribing the sensor topics
        if(!err){
            client.publish(sensortopic,"subscribed to sensor topic")
        }else{
            console.log("Subscription error:",err)
        }
    })
})
client.on("message",async (topic,message)=>{
    //message is being sent to mqtt
    console.log(`message from ${topic}:${message.toString()}`)
    try{
        const newRead=new sensorData({
            moisture:message.toString()
        });
        await newRead.save();
        console.log("sensor data saved to DB");
    }catch(err){
        console.error("Error occured",err.message);
    }   
    // client.end();
})
export const publishCommand=(cmd)=>{
    client.publish(actuatortopic,JSON.stringify(cmd));
}
export default client;