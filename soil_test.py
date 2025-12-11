import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)
SOIL_PIN = 22
GPIO.setup(SOIL_PIN, GPIO.IN)

print("Testing soil sensor... touch it with dry/wet soil!")

try:
    while True:
        raw = GPIO.input(SOIL_PIN)
        print("Raw soil value1:", raw)
        time.sleep(1)
except KeyboardInterrupt:
    GPIO.cleanup()
