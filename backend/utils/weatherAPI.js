import axios from "axios";
const API_KEY=process.env.OPENWEATHER_API_KEY;
const LOCATION=process.env.WEATHER_LOCATION;
export const getWeatherData=async()=>{
    try{
        if(!API_KEY){
            console.warn("NO weather api detected");
            return null;
        }
        const url=`https://api.openweathermap.org/data/2.5/weather?q=${LOCATION}&appid=${API_KEY}&units=metric`
        const {data}=await axios.get(url);
        const weather={
            temperature: data.main?.temp ?? null,
            humidity: data.main?.humidity ?? null,
            pressure: data.main?.pressure ?? null,
            condition: data.weather[0]?.main ?? "Unknown",
            rainChance: data?.rain?.["1h"] ? 80 : 0, // heuristic for now
            timestamp: new Date()
        }
        return weather;
    }catch(error){
        console.error("weather fetch failed",error.message);
        return null;
    }
}