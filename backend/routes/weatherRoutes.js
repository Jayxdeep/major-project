import express from "express";
import { getWeatherData } from "../utils/weatherAPI.js";
const router=express.Router();
router.get("/",async(_req,res)=>{
    const data=await getWeatherData();
    if(!data)return res.status(500).json({error:"Weather unavaible"});
    res.json(data);
})
export default router;
