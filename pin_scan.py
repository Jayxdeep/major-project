import RPi.GPIO as GPIO
import time

GPIO.setmode(GPIO.BCM)

pins = [4, 17, 18, 22, 23, 24, 25, 27]

for p in pins:
    GPIO.setup(p, GPIO.IN)

print("Fr scanning gpio pins for rain module ")

try:
    while True:
        for p in pins:
            val = GPIO.input(p)
            print(f"GPIO{p}: {val}", end=" | ")
        print()
        time.sleep(1)

except KeyboardInterrupt:
    GPIO.cleanup()
