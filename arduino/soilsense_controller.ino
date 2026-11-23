/*
 * SoilSense - Arduino Uno Soil Monitoring and Pump Controller
 *
 * Hardware Configuration:
 * - Soil Sensor: MH Flying Fish Capacitive Soil Moisture Sensor (v1.2 / v2.0)
 *   - VCC: 5V (or 3.3V depending on sensor variant)
 *   - GND: GND
 *   - AOUT: Analog Pin A1
 * - Pump Relay / MOSFET Driver:
 *   - Signal: Digital Pin D7 (Configurable)
 *   - Relay VCC/GND: Isolated 5V supply
 *   - DC Pump: External DC Power Supply (Flyback diode across inductive load)
 *
 * Serial Protocol:
 * Baud Rate: 9600 bps (standard, robust against cable noise)
 * Framing: JSON strings followed by newline '\n'
 *
 * Output messages:
 *   {"type":"boot","device":"soilsense_uno","version":"1.0.0"}
 *   {"type":"sensor","raw":680,"samples":16,"status":"ok","uptime_ms":1234}
 *   {"type":"pump_status","state":"OFF","runtime_ms":0,"reason":"idle"}
 *   {"type":"alert","code":"PUMP_TIMEOUT","message":"Safety timeout triggered"}
 *   {"type":"pong","uptime_ms":1234}
 *
 * Input commands:
 *   {"command":"pump","state":"ON"}
 *   {"command":"pump","state":"OFF"}
 *   {"command":"ping"}
 *   {"command":"status"}
 *   {"command":"configure","sample_rate_ms":1000}
 *
 * Safety Features:
 * 1. Safe default state on startup (Pump strictly OFF).
 * 2. Communication watchdog: If serial commands/heartbeats stop while pump is ON,
 *    pump automatically cuts off after WATCHDOG_TIMEOUT_MS.
 * 3. Max continuous runtime failsafe: Hard cut-off if pump runs longer than
 *    HARDWARE_MAX_RUNTIME_MS regardless of host state.
 * 4. Non-blocking asynchronous timing loop using millis().
 */

#define SENSOR_PIN A1
#define PUMP_PIN 7

// Relay module logic: Many 5V relay modules are ACTIVE LOW.
// Set to 1 if active HIGH (e.g. MOSFET driver, NPN transistor, or high-trigger relay)
// Set to 0 if active LOW (standard optocoupler relay board)
#define RELAY_ACTIVE_HIGH 1

// Safety timing thresholds in milliseconds
const unsigned long SENSOR_INTERVAL_MS = 1000;         // Read & transmit every 1s
const unsigned long HARDWARE_MAX_RUNTIME_MS = 60000;    // Hard 60-second failsafe cut-off
const unsigned long WATCHDOG_TIMEOUT_MS = 8000;        // 8s without serial heartbeat shuts pump off
const int OVERSAMPLE_COUNT = 16;                       // Number of ADC readings averaged

// State tracking
bool pumpActive = false;
unsigned long pumpStartTime = 0;
unsigned long lastSerialHeartbeat = 0;
unsigned long lastSensorReadTime = 0;

// Input buffer
String inputBuffer = "";
bool stringComplete = false;

void setPumpHardware(bool state) {
  if (state) {
    if (RELAY_ACTIVE_HIGH) {
      digitalWrite(PUMP_PIN, HIGH);
    } else {
      digitalWrite(PUMP_PIN, LOW);
    }
  } else {
    if (RELAY_ACTIVE_HIGH) {
      digitalWrite(PUMP_PIN, LOW);
    } else {
      digitalWrite(PUMP_PIN, HIGH);
    }
  }
}

int readFilteredSensor() {
  // Discard initial sample to allow ADC multiplexer voltage to stabilize
  analogRead(SENSOR_PIN);
  delayMicroseconds(100);

  long sum = 0;
  for (int i = 0; i < OVERSAMPLE_COUNT; i++) {
    sum += analogRead(SENSOR_PIN);
    delayMicroseconds(200);
  }
  return (int)(sum / OVERSAMPLE_COUNT);
}

void sendPumpStatus(const char* reason) {
  unsigned long runTime = pumpActive ? (millis() - pumpStartTime) : 0;
  Serial.print("{\"type\":\"pump_status\",\"state\":\"");
  Serial.print(pumpActive ? "ON" : "OFF");
  Serial.print("\",\"runtime_ms\":");
  Serial.print(runTime);
  Serial.print(",\"reason\":\"");
  Serial.print(reason);
  Serial.println("\"}");
}

void handleCommand(String json) {
  json.trim();
  if (json.length() == 0) return;

  lastSerialHeartbeat = millis();

  // Simple, low-overhead parser without requiring heavy external libraries
  if (json.indexOf("\"command\":\"pump\"") >= 0 || json.indexOf("\"pump\":") >= 0) {
    if (json.indexOf("\"ON\"") >= 0 || json.indexOf("\"state\":\"ON\"") >= 0) {
      if (!pumpActive) {
        pumpActive = true;
        pumpStartTime = millis();
        setPumpHardware(true);
        sendPumpStatus("host_command_on");
      } else {
        sendPumpStatus("already_on");
      }
    } else if (json.indexOf("\"OFF\"") >= 0 || json.indexOf("\"state\":\"OFF\"") >= 0) {
      if (pumpActive) {
        pumpActive = false;
        setPumpHardware(false);
        sendPumpStatus("host_command_off");
      } else {
        sendPumpStatus("already_off");
      }
    }
  } else if (json.indexOf("\"command\":\"ping\"") >= 0) {
    Serial.print("{\"type\":\"pong\",\"uptime_ms\":");
    Serial.print(millis());
    Serial.print(",\"pump_state\":\"");
    Serial.print(pumpActive ? "ON" : "OFF");
    Serial.println("\"}");
  } else if (json.indexOf("\"command\":\"status\"") >= 0) {
    sendPumpStatus("status_request");
  } else {
    // Acknowledge unhandled or echo
    Serial.print("{\"type\":\"ack\",\"uptime_ms\":");
    Serial.print(millis());
    Serial.println("}");
  }
}

void setup() {
  // Ensure pump pin is immediately configured as safe OUTPUT LOW before anything else
  pinMode(PUMP_PIN, OUTPUT);
  setPumpHardware(false);
  pumpActive = false;

  pinMode(SENSOR_PIN, INPUT);

  // Initialize Serial
  Serial.begin(9600);
  while (!Serial && millis() < 3000) {
    // Wait up to 3s for native USB boards (Leonardo, Micro), no-op on Uno
  }

  inputBuffer.reserve(128);
  lastSerialHeartbeat = millis();
  lastSensorReadTime = millis();

  // Send boot notification
  Serial.println("{\"type\":\"boot\",\"device\":\"soilsense_uno\",\"version\":\"1.0.0\",\"pump_pin\":7,\"sensor_pin\":\"A1\"}");
}

void loop() {
  unsigned long now = millis();

  // 1. Process incoming serial data
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    if (inChar == '\n') {
      stringComplete = true;
    } else if (inChar != '\r') {
      if (inputBuffer.length() < 120) {
        inputBuffer += inChar;
      }
    }
  }

  if (stringComplete) {
    handleCommand(inputBuffer);
    inputBuffer = "";
    stringComplete = false;
  }

  // 2. Hardware safety checks for pump
  if (pumpActive) {
    // Check hardware max runtime cut-off
    if (now - pumpStartTime >= HARDWARE_MAX_RUNTIME_MS) {
      pumpActive = false;
      setPumpHardware(false);
      Serial.println("{\"type\":\"alert\",\"code\":\"MAX_RUNTIME_EXCEEDED\",\"message\":\"Hardware failsafe reached maximum continuous run duration\"}");
      sendPumpStatus("failsafe_max_runtime");
    }
    // Check communication watchdog
    else if (now - lastSerialHeartbeat >= WATCHDOG_TIMEOUT_MS) {
      pumpActive = false;
      setPumpHardware(false);
      Serial.println("{\"type\":\"alert\",\"code\":\"WATCHDOG_TIMEOUT\",\"message\":\"Host communication lost while pump was active; emergency stop triggered\"}");
      sendPumpStatus("failsafe_comm_loss");
    }
  }

  // 3. Periodic sensor reading transmission
  if (now - lastSensorReadTime >= SENSOR_INTERVAL_MS) {
    lastSensorReadTime = now;
    int rawValue = readFilteredSensor();

    // Check abnormal readings (e.g. disconnected sensor often floats or pins to rail)
    const char* sensorStatus = "ok";
    if (rawValue <= 10) {
      sensorStatus = "abnormal_low";
    } else if (rawValue >= 1020) {
      sensorStatus = "abnormal_high_or_disconnected";
    }

    Serial.print("{\"type\":\"sensor\",\"raw\":");
    Serial.print(rawValue);
    Serial.print(",\"pin\":\"A1\",\"status\":\"");
    Serial.print(sensorStatus);
    Serial.print("\",\"pump_state\":\"");
    Serial.print(pumpActive ? "ON" : "OFF");
    Serial.print("\",\"uptime_ms\":");
    Serial.print(now);
    Serial.println("}");
  }
}
