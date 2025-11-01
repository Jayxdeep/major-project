import SensorData from "../models/sensorModel.js";
import{getavgmoist} from "../services/dataServices.js";
export const getsensorData=async(_req,res)=>{//sensor readings
    try{
        const data=await SensorData.find().sort({timestamp:-1});
        res.status(200).json(data);
    }catch(err){
        res.status(500).json({error:"sensor data failed",details:err.message});
    }
}
export const latestsensodata=async(_req,res)=>{
        try{
            const latest=await SensorData.findOne().sort({timestamp:-1})//ts:records the reading saved in db newest to first
            if(!latest){
                return res.status(404).json({message:"No sensor data is there"})
            }
            res.status(200).json(latest);
        }catch(err){
            res.status(500).json({error:"error in fetching latest data ",details:err.message});
        }
    }
export const getAvgMosit=async(_req,res)=>{
    try{
        const avg=await getAverageMosit();
        res.status(200).json({avgMosit:avg});
    }catch(err){
        res.status(500).json({error:"failed calc to avg moist",details:err.message})
    }
}