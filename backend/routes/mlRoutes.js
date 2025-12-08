import express from "express";
import { handleMLPredict } from "../controllers/mlController.js";
const router=express.Router();
router.post("/predict",handleMLPredict);
export default router;