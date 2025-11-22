import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import sensorRoutes from "./routes/sensorRoutes.js";
import irrigationRoutes from "./routes/irrigationRoutes.js";
const app = express();
app.use(cors());
app.use(express.json());
const limit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: {
    status: 429,
    error: "Too many requests",
  },
});
app.use("/api", limit);
app.use("/api/irrigation", irrigationRoutes);
app.use("/api/sensors", sensorRoutes);
export default app;