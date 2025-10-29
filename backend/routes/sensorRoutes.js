import express from 'express';
import{
    getAverageMosit

} from "../controllers/sensorController.js";
const router=express.Router();
router.get("/",);//sensors data fetch
router.get("/latest",)//some latest readings api
router.get("/average",)//some avg readings api
export default router;