import mongoose from "mongoose";
const sensorData=new mongoose.Schema({
    topic:{type:String,required: true},
    message:{type:String,required:true},
    timestamp:{type:Date, default:Date.now}
});
export default mongoose.model("SensorData",sensorData)