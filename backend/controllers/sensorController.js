import SensorData from "../models/sensorModel";
import{getAverageMosit} from "../services/dataServices.js";
export const getsensorData=async(req,res)=>{//sensor readings
    try{
        const data=await SensorData.find().sort({timestamp:-1});

    }catch(err){

    }
}
export const latestsensodata=async(req,res)=>{
        try{
            const latest=await SensorData.find().sort({timestamp:-1})//ts:records the reading saved in db newest to first
        }catch(err){

        }
    }