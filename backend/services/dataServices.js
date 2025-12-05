import SensorData from "../models/sensorModel.js";
//testing and reading will do ? , aggr process and calc data [sql{grp by()},avg()]
export const getAvgMosit=async(hours=24)=>{
    const since=new Date(Date.now()-hours*60*60*1000);
    const data=await SensorData.aggregate([
        {$match:{timestamp:{$gte:since}}},//sensor records frm 24hrs
        {$addFields:{moistNum:{$convert:{input:"$moisture",to:"double",onError:null,onNull:null}}}},
        {$match:{moistNum:{$ne:null}}},
        {$group:{_id:null,avgMoisit:{$avg:"$moistNum"}}} //grps filtered records 
    ]);
    console.log("aggr res",data);
    return data[0]?.avgMoisit || 0; 
}