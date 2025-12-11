import time
import json
import paho.mqtt.client as mqtt
import random
import requests
from dotenv import load_dotenv
import os

# Load .env
load_dotenv()

BROKER = "localhost"
TOPIC = "major/sensors"

API_KEY = os.getenv("OPENWEATHER_API_KEY")
CITY = os.getenv("CITY", "Bangalore,IN")

USE_HARDWARE_RAIN = True
USE_HARDWARE_SOIL = True

# Smoothing
smooth_moisture = 50

# For missing sensor detection
soil_dry_count = 0
soil_missing_threshold = 5     # ~15 seconds
try:
    import RPi.GPIO as GPIO
    GPIO.setmode(GPIO.BCM)

    # Two soil sensors
    SOIL1_PIN = 22     # First soil sensor
    SOIL2_PIN = 23     # Second soil sensor

    # Rain sensor
    RAIN_PIN = 27

    GPIO.setup(SOIL1_PIN, GPIO.IN)
    GPIO.setup(SOIL2_PIN, GPIO.IN)
    GPIO.setup(RAIN_PIN, GPIO.IN)

    print("Soil sensors enabled on GPIO22 & GPIO23")
    print("Rain sensor enabled on GPIO27")

except Exception as e:
    USE_HARDWARE_SOIL = False
    USE_HARDWARE_RAIN = False
    print("GPIO unavailable:", e)
    print("Running simulation mode.")
def get_weather():
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
        res = requests.get(url).json()
        return res["main"]["temp"], res["main"]["humidity"]
    except:
        return 27, 60
def get_rain_api_status():
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q={CITY}&appid={API_KEY}&units=metric"
        res = requests.get(url).json()
        cond = res["weather"][0]["main"]
        return 1 if cond in ["Rain", "Drizzle", "Thunderstorm"] else 0
    except:
        return random.choice([0, 1])
def get_soil_moisture():
    global smooth_moisture, soil_dry_count

    # Read both sensors
    raw1 = GPIO.input(SOIL1_PIN)
    raw2 = GPIO.input(SOIL2_PIN)

    # Debug:
    print(f"Raw soil1: {raw1} | Raw soil2: {raw2}")
    if raw1 == 1 and raw2 == 1:
        soil_dry_count += 1
    else:
        soil_dry_count = 0

    if soil_dry_count >= soil_missing_threshold:
        print("BOTH soil sensors not inserted or dry → skipping")
        return None, raw1, raw2
    if raw1 == 0 or raw2 == 0:
        target = 80      # WET
    else:
        target = 20      # DRY

    # smoothing
    smooth_moisture = int(smooth_moisture + (target - smooth_moisture) * 0.4)

    return smooth_moisture, raw1, raw2
def get_rain_hardware_status():
    try:
        raw = GPIO.input(RAIN_PIN)
        return 1 if raw == 0 else 0
    except:
        return get_rain_api_status()
client = mqtt.Client()
client.connect(BROKER, 1883, 60)

print("\n Running LIVE SENSOR STREAM... (CTRL+C to stop)\n")
try:
    while True:
        temperature, humidity = get_weather()

        # Soil moisture
        if USE_HARDWARE_SOIL:
            moisture, soil1_raw, soil2_raw = get_soil_moisture()

            if moisture is None:
                time.sleep(3)
                continue
        else:
            soil1_raw = soil2_raw = None
            moisture = random.randint(30, 70)

        # Rain
        if USE_HARDWARE_RAIN:
            rain = get_rain_hardware_status()
        else:
            rain = get_rain_api_status()

        # Final payload
        payload = {
            "moisture": moisture,
            "soil1": soil1_raw,
            "soil2": soil2_raw,
            "temperature": temperature,
            "humidity": humidity,
            "rainfall_detected": rain,
            "timestamp": int(time.time())
        }

        print("Publishing:", payload)
        client.publish(TOPIC, json.dumps(payload))

        time.sleep(3)

except KeyboardInterrupt:
    print("\nStopped by user.")
    try:
        GPIO.cleanup()
    except:
        pass

except Exception as e:
    print("Error:", e)
    try:
        GPIO.cleanup()
    except:
        pass