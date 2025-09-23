#include <Adafruit_Sensor.h>
#include <DHT.h>
#include <DHT_U.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Pin definitions
#define DHTPIN 15        
#define DHTTYPE DHT22    
#define POT1_PIN 26      
#define POT2_PIN 27      
#define RELAY_PIN 16     

// OLED configs
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Sensor
DHT dht(DHTPIN, DHTTYPE);
int pot1_max = 0;
int pot2_max = 0;
int pot1_min = 4095;
int pot2_min = 4095;

void setup() {
  Serial.begin(9600);            

  // Start DHT22
  dht.begin();

  Wire.begin();

  // Start OLED
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { 
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }
  display.clearDisplay();

  // Relay setup
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); 

  Serial.println("System Initialized.");
}

void loop() {
  // Read sensors 
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  int soil1 = analogRead(POT1_PIN);
  int soil2 = analogRead(POT2_PIN);

  if (soil1 > pot1_max) pot1_max = soil1;
  if (soil2 > pot2_max) pot2_max = soil2;
  if (soil1 < pot1_min) pot1_min = soil1;
  if (soil2 < pot2_min) pot2_min = soil2;

  // Error handling
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  // Prevent divide-by-zero
  int range1 = max(1, pot1_max - pot1_min);
  int range2 = max(1, pot2_max - pot2_min);

  // Convert soil moisture to percentage
  int soil1_percent = map(soil1, pot1_min, pot1_max, 0, 100);
  int soil2_percent = map(soil2, pot2_min, pot2_max, 0, 100);

  // Clamp values
  soil1_percent = constrain(soil1_percent, 0, 100);
  soil2_percent = constrain(soil2_percent, 0, 100);

  // Print to Serial
  Serial.print("Temp: "); Serial.print(temp); Serial.print("°C  ");
  Serial.print("Humidity: "); Serial.print(hum); Serial.println("%");
  Serial.print("Soil1 raw: "); Serial.print(soil1); Serial.print(" -> "); Serial.print(soil1_percent); Serial.println("%");
  Serial.print("Soil2 raw: "); Serial.print(soil2); Serial.print(" -> "); Serial.print(soil2_percent); Serial.println("%");

  // Display on OLED
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);  display.print("Temp: "); display.print(temp); display.println(" C");
  display.setCursor(0, 10); display.print("Hum: "); display.print(hum); display.println(" %");
  display.setCursor(0, 20); display.print("Soil1: "); display.print(soil1_percent); display.println(" %");
  display.setCursor(0, 30); display.print("Soil2: "); display.print(soil2_percent); display.println(" %");

  display.display();

  // Relay control logic
  if (soil1_percent < 40 || soil2_percent < 40) {  
    digitalWrite(RELAY_PIN, HIGH); 
  } else {
    digitalWrite(RELAY_PIN, LOW);  
  }

  delay(2000); 
}