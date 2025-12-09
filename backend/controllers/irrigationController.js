import irrigation from "../models/irrigationModel.js";
import { publishCommand } from "../utils/mqttClient.js";

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
      details: err.message
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
    doc.lastCommandAt = new Date();
    doc.history.unshift({
      action,
      source,
      reason,
      createdAt: doc.lastCommandAt
    });

    if (doc.history.length > 50) doc.history = doc.history.slice(0, 50);

    await doc.save();

    res.status(200).json({
      message: `Irrigation ${action} command published`,
      status: doc.status
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to control irrigation",
      details: err.message
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

    doc.lastCommandAt = new Date();
    doc.history.unshift({
      action: `MODE:${mode}`,
      source: "user",
      reason: `Set threshold ${threshold ?? doc.threshold}`,
      createdAt: doc.lastCommandAt
    });

    if (doc.history.length > 50) doc.history = doc.history.slice(0, 50);

    await doc.save();

    res.status(200).json({
      message: `Mode set to ${mode}`,
      mode: doc.mode,
      threshold: doc.threshold
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to set mode",
      details: err.message
    });
  }
};
