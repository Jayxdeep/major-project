import express from "express";
import sensorRoutes from "./routes/sensorRoutes.js"; 
// import connectDB from "./config/db.js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/sensors", sensorRoutes);

export default app;