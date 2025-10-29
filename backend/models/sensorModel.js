import mongoose from "mongoose";

const sensorSchema = new mongoose.Schema(
  {
    moisture: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { versionKey: false } 
);

const SensorData = mongoose.model("SensorData", sensorSchema);

export default SensorData;
