import SensorData from "../models/sensorModel.js";
//testing and reading will do ? , aggr process and calc data [sql{grp by()},avg()]
export const getavgmoist=async(hours=24)=>{
    const since=new Date(Date.now()-hours*60*60*1000);
    const data=await SensorData.aggregate([
        {$match:{timestamp:{$gte:since}}},//sensor records frm 24hrs
        {$group:{_id:null,avgMoisit:{$avg:"$moisture"}}} //grps filtered records
    ]);
    return data[0]?.avgMoisit || 0; 
}