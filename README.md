# Climate-Adaptive IoT Drip Irrigation System

An IoT-based smart irrigation solution designed to optimize water usage in agriculture using soil moisture sensors, weather data, MQTT communication, and cloud-based dashboards. The system adapts irrigation schedules based on real-time soil conditions and climate factors, promoting sustainable farming practices.

This project is currently under development as a major interdisciplinary project (ECE + CE).

## Features

- Real-time monitoring of soil moisture levels.
- Automated irrigation control using solenoid valves.
- MQTT communication between sensors, controllers, and cloud.
- Cloud dashboard for live visualization and reports.
- Weather integration for climate-adaptive decision-making.
- Optional solar-powered setup for energy efficiency.
- Simulation tested using Wokwi and integrated into project repo.




## Tech Stack

**Hardware:** Soil Moisture Sensors, Solenoid Valves, Microcontroller(Rasberry pi wifi module)

**Backend:** Node, Express,Monogo DB

**Communication:** MQTT

**Frontend/Dashboard:** React 

**Simulation:** Wokwi


## Wokwi Simulation
The Wokwi simulation files are included under the WOKWI folder 

- To run:
    - Open the WOKWI folder in Wokwi(site)
    - Upload the JSON files
    - Run the simulation to test soil moisture values and irrigation logic.


## Setup Instruction

To clone the repo

```bash
  git clone <repo-url>
  cd major-project

```
Install Dependencies

```bash
    npm install
```

Add your environment variables in .env:

```bash
    MONGO_URI=your_mongodb_connection_string
    MQTT_BROKER=mqtt://broker.hivemq.com
    WEATHER_API_KEY=your_weather_api_key
    PORT=
```
Start server

```bash
    npx nodemon
```

## End Results

The project is still under development. Stay tuned for updates on the final results!
