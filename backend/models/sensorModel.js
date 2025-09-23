import mongoose from "mongoose";
const sensorData=new mongoose.Schema({
    topic:String,
    message:String,
    timestamp:{type:Date, default:Date.now}
});
export default mongoose.model("SensorData",sensorData)