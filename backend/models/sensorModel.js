import mongoose from "mongoose";

const sensorSchema = new mongoose.Schema({
  moisture: {
    type: Number,
    required: true
  },
  temperature: {
    type: Number,
    default: null
  },
  humidity: {
    type: Number,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const SensorData = mongoose.model("SensorData", sensorSchema);
export default SensorData;
