import express from 'express';
import{
    getsensorData,
    latestsensodata,
    getAvgMosit
} from "../controllers/sensorController.js";
const router=express.Router();
router.get("/",getsensorData);//sensors data fetch
router.get("/latest",latestsensodata)//some latest readings api
router.get("/average",getAvgMosit)//some avg readings api
export default router;