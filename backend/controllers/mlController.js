import { reqPredictMl } from "../services/mlService.js";
export const handleMLPredict= async(req,res)=>{
    try{
        const result=await reqPredictMl(req.body);
        return res.status(200).json({
            sucess:true,
            message:"Prediction recieved",
            result,
        });
    }catch(error){
        console.error("ML prediction error:",error.message);
        return res.status(500).json({
            succes:false,
            error:"Failed to do the prediction",
            details:error.message,
        })
    }
}