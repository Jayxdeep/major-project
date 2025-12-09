import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import sensorRoutes from "./routes/sensorRoutes.js";
import irrigationRoutes from "./routes/irrigationRoutes.js";
import mlRoutes from "./routes/mlRoutes.js"
import weatherRoutes from "./routes/weatherRoutes.js"
import historyRoutes from "./routes/historyRoutes.js"
const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  credentials: false
}))
app.use(express.json());
const limit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: {
    status: 429,
    error: "Too many requests",
  },
});
app.use("/api", limit);
app.use("/api/irrigation", irrigationRoutes);
app.use("/api/sensors", sensorRoutes);
app.use('/api/weather',weatherRoutes);
app.use("/api/ml",mlRoutes);
app.use("/api/history",historyRoutes)
export default app;