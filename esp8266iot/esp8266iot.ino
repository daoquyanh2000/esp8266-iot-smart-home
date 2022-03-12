#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "DHT.h"
#include <BH1750.h>
#include <Wire.h>
#include <ArduinoJson.h>

#define DHTPIN D3 // what digital pin we're connected to
#define DHTTYPE DHT11 // DHT 11
#define LEDREDPIN D5
#define LEDGREENPIN D6
#define LEDBLUEPIN D7
#define topicSensor "esp8266-iot/sensor"
#define topicLEDRed "esp8266-iot/led-red"
#define topicLEDGreen "esp8266-iot/led-green"
#define topicLEDBlue "esp8266-iot/led-blue"
DHT dht(DHTPIN, DHTTYPE);
BH1750 lightMeter;
// Thông tin về wifi
#define ssid "quangoc"
#define password "conmeo123"
#define mqtt_server "broker.emqx.io"
#define username ""
#define passwd ""
#define clientid "esp8266test"
const uint16_t mqtt_port = 1883; //Port của CloudMQTT TCP

// Define NTP Client to get time
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP);
WiFiClient espClient;
PubSubClient client(espClient);


// Variables to save date and time
String formattedDate;
String dayStamp;
String timeStamp;
char message[200];
// Variables for temperature and humidity
int temp, hum;
uint16_t lux;
unsigned long t;

void setup()
{
  pinMode(LEDREDPIN, OUTPUT); // red led
  pinMode(LEDGREENPIN, OUTPUT); // green led
  pinMode(LEDBLUEPIN, OUTPUT); // blue led
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  //setup dht
  dht.begin();
  Wire.begin();
  lightMeter.begin();
  // Initialize a NTPClient to get time
  timeClient.begin();
  timeClient.setTimeOffset(+7 * 60 * 60);


}
// Hàm kết nối wifi
void setup_wifi()
{
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

}
// Hàm call back để nhận dữ liệu
void callback(char* topic, byte* payload, unsigned int length)
{
  //  char* msg = "";
  //  for (int i = 0; i < length; i++) {
  //    msg[i] = (char)payload[i];
  //    msg[i + 1] = '\0';
  //    
  //  }
  //   Serial.println();
  Serial.print("Co tin nhan moi tu topic:");
  Serial.println(topic);
  char p[length + 1];
  memcpy(p, payload, length);
  p[length] = NULL;
  String msg(p);
  if (String(topic) == topicLEDRed)
  {
    (msg == "on") ? digitalWrite(LEDREDPIN, HIGH) : digitalWrite(LEDREDPIN, LOW);
  }

  if (String(topic) == topicLEDGreen)
  {
    (msg == "on") ? digitalWrite(LEDGREENPIN, HIGH) : digitalWrite(LEDGREENPIN, LOW);
  }
  if (String(topic) == topicLEDBlue)
  {
    (msg == "on") ? digitalWrite(LEDBLUEPIN, HIGH) : digitalWrite(LEDBLUEPIN, LOW);
  }
  Serial.println(msg);
}

// Hàm reconnect thực hiện kết nối lại khi mất kết nối với MQTT Broker
void reconnect()
{
  while (!client.connected()) // Chờ tới khi kết nối
  {
    // Thực hiện kết nối với mqtt user và pass
    if (client.connect(clientid, username, passwd))  //kết nối vào broker
    {
      Serial.println("Đã kết nối:");
      client.subscribe(topicSensor); //đăng kí nhận dữ liệu từ topic
      client.subscribe(topicLEDRed); //đăng kí nhận dữ liệu từ topic
      client.subscribe(topicLEDGreen); //đăng kí nhận dữ liệu từ topic
      client.subscribe(topicLEDBlue); //đăng kí nhận dữ liệu từ topic
    }
    else
    {
      Serial.print("Lỗi:, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      // Đợi 5s
      delay(5000);
    }
  }
}

void loop()
{
  if (!client.connected())// Kiểm tra kết nối
    reconnect();
  client.loop();

  if (millis() - t > 1000) //nếu 1 giây trôi qua
  {
    t = millis();

    update_data();
    json_package();
    client.publish(topicSensor, message ); // gửi dữ liệu lên topic esp8266-iot-sensor
  }


}

void update_data()
{
  //update if not get the legit time from the server
  while (!timeClient.update()) {
    timeClient.forceUpdate();
  }
  //get the time
  formattedDate = timeClient.getFormattedDate();

  hum = dht.readHumidity();
  // Read temperature as Celsius (the default)
  temp = dht.readTemperature();

  // Check if any reads failed and exit early (to try again).
  if (isnan(hum) || isnan(temp )) {
    Serial.println("Failed to read from DHT sensor!");
  }

  lux = lightMeter.readLightLevel();

}
void json_package()
{
  // Allocate the JSON document
  StaticJsonDocument<200> doc;



  doc["date"] = formattedDate;
  //doc["time"] = timeStamp;
  doc["humidity"] = hum;
  doc["temperature"] = temp;
  doc["light"] = lux;

  //read red led state
  if (digitalRead(LEDREDPIN) == HIGH)
    doc["redled"] = "on";
  else
    doc["redled"] = "off";
  //read red green state
  if (digitalRead(LEDGREENPIN) == HIGH)
    doc["greenled"] = "on";
  else
    doc["greenled"] = "off";
  //read red blue state
  if (digitalRead(LEDBLUEPIN) == HIGH)
    doc["blueled"] = "on";
  else
    doc["blueled"] = "off";
  serializeJson(doc, message);
  //Serial.println(message);
}
