import express from 'express';
import{
    getsensorData,
    latestsensodata,
    handleAvgMosit
} from "../controllers/sensorController.js";
const router=express.Router();
router.get("/",getsensorData);//sensors data fetch
router.get("/latest",latestsensodata)//some latest readings api
router.get("/average",handleAvgMosit)//some avg readings api
export default router;