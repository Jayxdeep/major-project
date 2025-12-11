import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

SOIL2_PIN = 23   # Your new soil sensor on GPIO23 (Pin 16)
GPIO.setup(SOIL2_PIN, GPIO.IN)

print("Testing SOIL SENSOR #1 (new one)... touch with dry/wet soil!")
print("Dry → raw = 1")
print("Wet → raw = 0")

try:
    while True:
        raw = GPIO.input(SOIL2_PIN)
        print("Raw soil2 value:", raw)
        time.sleep(1)

except KeyboardInterrupt:
    GPIO.cleanup()
    print("Stopped soil test.")
