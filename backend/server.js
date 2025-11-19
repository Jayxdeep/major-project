import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import connectDB from './config/db.js';
import "./utils/mqttClient.js"
import sensorRoutes from "./routes/sensorRoutes.js"
app.use('/api/sensors',sensorRoutes);//
const PORT=process.env.PORT ||3000;
const startserver=async()=>{
    try{
        await connectDB();
        app.listen(PORT,()=>{
            console.log(`Server running on port:${PORT}`)
        })
    }catch(error){
        console.log("Server connection failed",error)
        process.exit(1);
    }
}
startserver();