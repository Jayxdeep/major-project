import cron from "node-cron"
import SensorData from "../models/sensorModel.js"
import irrigation from "../models/irrigationModel.js"
import {publishCommand} from "../utils/mqttClient.js"
import {getWeatherData} from "../utils/weatherAPI.js"
const hyster=3;
const cool_ms=2*60*1000;
const max_on_ms=20*60*1000;
console.log("Auto Irrigation engine loaded");
cron.schedule("*/1****",async()=>{
    console.log("Running the irrigation automation cycle");
    try{
        const settings=await irrigation.findOne();
        if(!settings){
            return console.log("NO irrigation settings are found");
        }
        if(settings.mode!=="AUTO"){
            return console.log("Auto mode is disabled");
        }
        const latest=await SensorData.findOne().sort()
    }
})