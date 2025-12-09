import express from "express";
import irrigation from "../models/irrigationModel.js";
const router = express.Router();
router.get("/", async (req, res) => {
  try {
    const doc = await irrigation.findOne();
    res.status(200).json(doc.history || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
export default router;