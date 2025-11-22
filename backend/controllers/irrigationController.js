import irrigation from "../models/irrigationModel.js";
//logic from above model later do this
import { publishCommand } from "../utils/mqttClient.js"; //pub sub cmnd
const getIrrigdoc=async()=>{
    let doc= await irrigation.findOne();//check and sort one by one
    if(!doc){
        doc=await irrigation.create({}); //create a doc
    }
    return doc;
}
export const getIrrigStas=async(_req,res)=>{
    try{
        const doc= await getIrrigdoc();
        res.status(200).json(doc);
    }catch(err){
        res.status(500).json({error: "Failed to fetch irrigation status",details: err.message})
    }
}
export const contIrrig= async(req,res)=>{
    try{
        const {action,source="user",reason=""}=req.body;
        if(!["ON","OFF"].includes(action)){
            return res.status(400).json({error:"Invalid action"});
        }
        const doc=await getIrrigdoc();
        publishCommand({action});//json 
        doc.status=action;
        doc.lastCmdAt=new Date();
        doc.history.unshift({action,source,reason,createdAt:doc.lastCmdAt});
        if(doc.history.length>50) doc.history=doc.history.slice(0,50)
            await doc.save();
        res.status(200).json({message:`Irrigation ${action}command published`,status:doc.status});
    }
    catch(err){
        res.status(400).json({messge:"failed to contol irrigation",details:err.message})
    }
}
export const setIrrgMode=async(req,res)=>{
    try{
        const {mode,threshold}=req.body
        if(!["AUTO","MANUAL"].includes(mode)){
            return res.status(200).json({error:"invalid mode"});
        }
        const doc=await getIrrigdoc();
        doc.mode=mode;
        if(typeof threshold==="number"){
            doc.threshold=threshold;
        }
        doc.lastCmdAt=new Date();
        doc.history.unshift({action:`MODE:${mode}`,source:"user",reason:`Set threshold ${threshold??doc.threshold}`,createdAt:doc.lastCmdAt})
        if(doc.history.length>50) doc.history=doc.history.slice(0,50); //50 entries max
            await doc.save();
        res.status(200).json({message:`Mode set to ${mode}`,mode: doc.mode,threshold:doc.threshold});
    }catch(err){
        res.status(500).json({message: "failed to set mode",details:err.message});
    }
}