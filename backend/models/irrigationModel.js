import mongoose from "mongoose";
// History Schema - tracks irrigation logic events
const irrigHistSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["ON", "OFF", "MODE_AUTO", "MODE_MANUAL"] 
    },
    source: {
      type: String,
      enum: ["user", "system", "AUTO-ML"],  
      default: "user"
    },
    reason: {
      type: String,
      default: ""
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);
// Main irrigation control Schema
const irrSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["ON", "OFF"],
      default: "OFF"
    },
    mode: {
      type: String,
      enum: ["AUTO", "MANUAL"],
      default: "MANUAL"
    },
    threshold: {
      type: Number,
      default: 40 // moisture % limit (editable via UI)
    },
    lastCmdAt: {
      type: Date
    },
    lastAppMoist: {
      type: Number,
      default: null
    },
    history: {
      type: [irrigHistSchema],
      default: []
    }
  },
  { timestamps: true, versionKey: false }
);
const irrigation = mongoose.model("irrigation", irrSchema);
export default irrigation;