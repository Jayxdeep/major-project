import irrigation from "../models/irrigationModel.js";
import { publishCommand } from "../utils/mqttClient.js";
import { io } from "../server.js";
const getIrrigDoc = async () => {
  let doc = await irrigation.findOne();
  if (!doc) doc = await irrigation.create({});
  return doc;
};
export const getIrrigStas = async (_req, res) => {
  try {
    const doc = await getIrrigDoc();
    res.status(200).json(doc);
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch irrigation status",
      details: err.message,
    });
  }
};
export const contIrrig = async (req, res) => {
  try {
    const { action, source = "user", reason = "" } = req.body;
    if (!["ON", "OFF"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }
    const doc = await getIrrigDoc();
    publishCommand({ action });
    doc.status = action;
    doc.lastCmdAt = new Date();
    const finalReason =
      doc.mode === "MANUAL" ? "Manual mode override" : reason || "";

    doc.history.unshift({
      action,
      source,
      reason: finalReason,
      createdAt: doc.lastCmdAt,
    });

    if (doc.history.length > 50) {
      doc.history = doc.history.slice(0, 50);
    }
    await doc.save();
    io.emit("pump_update", {
      pumpStatus: action,
      decidedBy: finalReason,
      timestamp: doc.lastCmdAt,
    });

    res.status(200).json({
      message: `Irrigation ${action} command published`,
      status: doc.status,
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to control irrigation",
      details: err.message,
    });
  }
};
export const setIrrgMode = async (req, res) => {
  try {
    const { mode, threshold } = req.body;
    if (!["AUTO", "MANUAL"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }
    const doc = await getIrrigDoc();
    doc.mode = mode;
    if (typeof threshold === "number") {
      doc.threshold = threshold;
    }
    doc.lastCmdAt = new Date();
    const actionLog = mode === "AUTO" ? "MODE_AUTO" : "MODE_MANUAL";
    const modeReason =
      mode === "MANUAL"
        ? "Switched to MANUAL mode — ML disabled"
        : `Switched to AUTO mode (threshold ${threshold ?? doc.threshold})`;
    doc.history.unshift({
      action: actionLog,
      source: "user",
      reason: modeReason,
      createdAt: doc.lastCmdAt,
    });
    if (doc.history.length > 50) {
      doc.history = doc.history.slice(0, 50);
    }
    await doc.save();
    io.emit("pump_update", {
      pumpStatus: doc.status,
      decidedBy: modeReason,
      timestamp: doc.lastCmdAt,
    });
    res.status(200).json({
      message: `Mode set to ${mode}`,
      mode: doc.mode,
      threshold: doc.threshold,
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to set mode",
      details: err.message,
    });
  }
};
