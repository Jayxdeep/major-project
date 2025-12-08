import axios from "axios"
export const reqPredictMl=async(payload)=>{
    try{
        const url=process.env.ML_URL
        console.log(`Sending data to ML services @ ${url}`);
        const resp=await axios.post(url,payload);
        return resp.data;
    }catch(err){
        console.error("ML Service down",err.message);
        throw  new Error("ML service request failed");
    }
}