import RPi.GPIO as GPIO
import time

RAIN_PIN = 27  # Your rain sensor pin

GPIO.setmode(GPIO.BCM)
GPIO.setup(RAIN_PIN, GPIO.IN)

print("Rain Sensor Test (1 = Rain, 0 = No rain)")
print("Sprinkle water to test... CTRL+C to stop")

try:
    while True:
        raw = GPIO.input(RAIN_PIN)   # raw: 0 = wet, 1 = dry
        rain = 1 if raw == 0 else 0  # convert to: 1 = rain, 0 = no rain
        print("Rainfall_detected:", rain)
        time.sleep(1)

except KeyboardInterrupt:
    GPIO.cleanup()
    print("Test stopped.")
