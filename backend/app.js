import express from "express";
import sensorRoutes from "./routes/sensorRoutes.js"; 
import rateLimit from 'express-rate-limit';
// import connectDB from "./config/db.js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const limit=rateLimit({
    windowMs:1*60*1000,
    max:10,
    message:{
        status:429,
        error:"Too many requests"
    }
});
app.use("/api",limit);

app.use("/api/sensors", sensorRoutes);

export default app;