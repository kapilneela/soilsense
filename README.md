# SoilSense — Precision Soil Intelligence, Crop Monitoring & Automated Irrigation Platform

**SoilSense** is a precision agricultural IoT platform connecting an **Arduino Uno** soil telemetry gateway to a high-performance **Python FastAPI** local agronomic decision engine and a **mobile-first React** web interface.

The platform provides real-time capacitive soil moisture measurement, multi-point calibration, soil hydraulic modeling, crop phenological stage interpretation, and dual-threshold automated irrigation control with strict hardware watchdog protections.

---

## 1. System Architecture

```text
  +-------------------------------------------------------------+
  |                   HARDWARE SENSOR LAYER                     |
  |  MH Flying Fish Capacitive Soil Moisture Sensor v1.2/v2.0   |
  |  VCC -> 5V  |  GND -> GND  |  AOUT -> Analog Pin A1         |
  +-------------------------------------------------------------+
                               |
                               v (Analog Voltage)
  +-------------------------------------------------------------+
  |                     ARDUINO UNO GATEWAY                     |
  |  - 16x Oversampling Noise Rejection Filter                  |
  |  - Continuous Telemetry Serialization (9600 baud JSON)       |
  |  - Digital Pin D7 Optocoupler Relay / MOSFET Pump Driver    |
  |  - Autonomous Hardware Watchdog (8s Comm Timeout)           |
  |  - Hard Cut-off Safety Failsafe (60s Max Runtime)           |
  +-------------------------------------------------------------+
                               |
                               v (USB Serial: COMx / JSON)
  +-------------------------------------------------------------+
  |                 PYTHON FASTAPI BACKEND GATEWAY               |
  |  - PySerial Hardware Discovery & Auto-Reconnection Loop    |
  |  - EMA Noise Suppression & Relative Moisture Translation    |
  |  - Soil Hydraulics Database (8 Verified Classifications)    |
  |  - Crop Phenological Database (25 Verified Crops)           |
  |  - Stage-Specific Dual-Threshold Hysteresis Decision Engine |
  |  - SQLite Telemetry & Event Persistence (soilsense.db)      |
  |  - WebSocket Live Telemetry Broadcaster (/ws/live)          |
  +-------------------------------------------------------------+
                               |
                               v (WebSocket + REST API)
  +-------------------------------------------------------------+
  |               REACT MOBILE-FIRST WEB APPLICATION            |
  |  - Live Moisture Gauge & 60s Sparkline                      |
  |  - Soil Hydraulic & Texture Intelligence Profiles           |
  |  - Crop Phenology & Water Stress Sensitivity Guides         |
  |  - Manual & Automatic Pump Controls with E-Stop Lockout     |
  |  - Recharts Telemetry Visualizer (Hourly / Daily / Weekly)  |
  |  - Step-by-Step Multi-Point Soil Calibration Wizard         |
  +-------------------------------------------------------------+
```

---

## 2. Hardware Wiring & Electrical Safety Guide

> [!CAUTION]
> **DC Inductive Load Protection:** Never connect a DC motor or water pump directly to an Arduino GPIO pin. Doing so will permanently destroy the microcontroller. Always utilize an optocoupled relay module or an N-channel logic-level MOSFET driver board with an external power supply.

### A. Arduino Pin Connections

| Component | Pin / Terminal | Arduino Pin | Notes |
| :--- | :--- | :--- | :--- |
| **Capacitive Moisture Sensor** | VCC | `5V` (or `3.3V`) | MH Flying Fish / v1.2 / v2.0 |
| **Capacitive Moisture Sensor** | GND | `GND` | Common ground |
| **Capacitive Moisture Sensor** | AOUT | `A1` | 10-bit Analog Input |
| **Pump Relay / MOSFET Module**| IN / SIG | `D7` | Digital Output (Configurable) |
| **Pump Relay Module** | VCC | `5V` | Isolated logic rail |
| **Pump Relay Module** | GND | `GND` | Common logic ground |

### B. DC Pump External Power Circuit
- **Pump Positive (+):** Connect to External DC Power Supply Positive (+12V or +5V depending on pump).
- **Pump Negative (-):** Connect to Relay Normally Open (`NO`) or MOSFET Drain (`D`).
- **Relay Common (`COM`) / MOSFET Source (`S`):** Connect to External Power Supply Negative (Ground).
- **Flyback Protection Diode:** Place a `1N4007` diode across the pump's positive and negative terminals with the cathode (striped band) pointing to the positive rail. This suppresses inductive flyback voltage spikes during motor shutoff.

---

## 3. Soil Intelligence Database

SoilSense contains verified hydraulic characteristics for 8 soil classifications:

1. **Sandy Soil:** High permeability (>25 mm/hr), low water retention (0.7-1.2 in/ft). Requires high-frequency, low-volume pulse irrigation.
2. **Clay Soil:** Very high water holding capacity (2.0-2.5 in/ft), slow infiltration (1-5 mm/hr). Requires slow application rates to prevent surface runoff and root hypoxia.
3. **Loamy Soil:** The agricultural standard (approx 40% sand, 40% silt, 20% clay). Balanced aeration and 1.5-2.2 in/ft moisture storage.
4. **Silty Soil:** Floury texture with high moisture storage (2.0-2.4 in/ft). Requires gentle low-pressure emitters to avoid crusting.
5. **Sandy Loam:** Optimal warm market-gardening soil. High drainage with dependable moisture storage.
6. **Red Soil:** Iron-rich, porous crystalline soil. Moderate drainage; requires organic mulching to prevent moisture evaporation.
7. **Black Soil (Regur/Vertisol):** Smectite clay with dramatic shrink-swell characteristics. Retains deep moisture for months.
8. **Peaty Soil:** High organic matter (>25%). Exceptional gravimetric moisture absorption (200-400% of dry weight).

*Note: Selecting a soil type in SoilSense updates the hydraulic threshold models and infiltration timings, but never artificially manipulates the physical raw sensor voltage.*

---

## 4. Crop Intelligence & Growth Stages

The platform includes verified agronomic profiles for 25 commercial crops across 4 categories:

- **Cereals:** Rice, Wheat, Maize, Sorghum, Pearl Millet.
- **Vegetables:** Tomato, Potato, Onion, Cabbage, Cauliflower, Spinach, Chilli, Brinjal, Cucumber.
- **Fruits:** Mango, Banana, Watermelon, Grapes, Papaya, Pomegranate.
- **Commercial Crops:** Cotton, Sugarcane, Groundnut, Soybean, Turmeric.

### Phenological Growth Stages
Each crop profile models 5 growth stages:
- **Seedling:** Delicate surface roots; light, frequent moisture to prevent desiccation.
- **Vegetative:** Foliage expansion and structural biomass growth.
- **Flowering / Anthesis:** Peak water sensitivity. Water deficit causes severe blossom drop and yield collapse.
- **Fruiting / Tuber Bulking:** High volumetric water sink demand; requires steady irrigation to prevent fruit split or hollow heart.
- **Maturity / Ripening:** Controlled moisture taper to concentrate sugars and ensure post-harvest durability.

---

## 5. Intelligent Dual-Threshold Hysteresis Engine

To prevent motor chattering and excessive mechanical relay wear, SoilSense implements asymmetric dual-threshold hysteresis:

$$\text{Irrigation Trigger Condition: } \text{Moisture}_{\text{current}} < \text{Moisture}_{\text{minimum}}$$

$$\text{Irrigation Cutoff Condition: } \text{Moisture}_{\text{current}} \ge \text{Moisture}_{\text{target}} \quad \text{OR} \quad \text{Runtime} \ge \text{Duration}_{\text{limit}}$$

### Mandatory Failsafes & Watchdogs:
1. **Hardware Watchdog:** If the host laptop crashes or loses USB communication while the pump is active, the Arduino firmware automatically de-energizes digital pin D7 after 8 seconds.
2. **Hardware Max Runtime Cut-off:** Hard 60-second limit enforced directly inside the Arduino firmware regardless of server state.
3. **Software Max Continuous Limit:** Backend enforces a 45-second single-cycle cutoff.
4. **Cycle Soak Cooldown:** Enforces a mandatory 60-second rest period between pump runs to allow soil water infiltration and sensor stabilization.
5. **Daily Quota Limiter:** Hard cap of 600 seconds (10 minutes) total pump runtime per 24 hours.
6. **Sensor Signal Validity Check:** If the sensor disconnects (ADC $\ge$ 1005 or $\le$ 20) or telemetry is stale (>6 seconds), the pump is locked in the OFF state.
7. **Emergency Stop Lockout:** Instantly terminates pump actuation and requires an explicit manual operator reset.

---

## 6. Installation & Quick Start Guide (Windows)

### Prerequisites
- Python 3.10+ (Python 3.11, 3.12, 3.13, 3.14 verified)
- Node.js 18+ and npm
- Arduino IDE (to flash the Uno board)

### Step 1: Flash Arduino Uno Firmware
1. Connect your Arduino Uno to the Windows laptop via USB.
2. Open the Arduino IDE.
3. Open `arduino/soilsense_controller.ino`.
4. Select **Tools > Board > Arduino Uno**.
5. Select **Tools > Port > COMx** (the COM port assigned to your Uno).
6. Click **Upload**.
7. Open the Arduino Serial Monitor (9600 baud) to verify the boot message:
   ```json
   {"type":"boot","device":"soilsense_uno","version":"1.0.0","pump_pin":7,"sensor_pin":"A1"}
   ```
8. Close the Serial Monitor before launching the Python backend so the serial port is free.

### Step 2: Start the Python Backend Server
1. Open PowerShell or Command Prompt.
2. Navigate to the backend directory:
   ```powershell
   cd C:\Users\neela\.gemini\antigravity\scratch\soilsense\backend
   ```
3. Install dependencies:
   ```powershell
   pip install -r requirements.txt
   ```
4. Start the server:
   ```powershell
   python main.py
   ```
   *The server starts on `http://localhost:8000` and automatically scans for your connected Arduino Uno.*

### Step 3: Start the React Frontend Application
1. Open a new PowerShell terminal.
2. Navigate to the frontend directory:
   ```powershell
   cd C:\Users\neela\.gemini\antigravity\scratch\soilsense\frontend
   ```
3. Install frontend packages:
   ```powershell
   npm install
   ```
4. Launch the local development server:
   ```powershell
   npm run dev
   ```
5. Open your browser at `http://localhost:3000`.

To access SoilSense on your mobile phone:
- Connect your phone to the same local Wi-Fi network as your laptop.
- Open your laptop's local IP address (e.g., `http://192.168.1.50:3000`) in Chrome or Safari on your phone.

---

## 7. Interactive Sensor Calibration Procedure

Capacitive soil sensors measure dielectric permittivity. Because soil mineral composition and bulk density vary, always perform initial calibration:

1. In the SoilSense web app, open **Sensor Calibration**.
2. **Step 1 (Air):** Hold the dry probe in the air. Click **Capture Air Reading** (typically 750 - 850 ADC).
3. **Step 2 (Dry Soil):** Insert the probe into an oven-dry sample of your target soil. Click **Capture Dry Soil Reading**.
4. **Step 3 (Wet Soil):** Thoroughly saturate the soil sample until water puddles. Wait 15 seconds. Click **Capture Wet Soil Reading** (typically 320 - 450 ADC).
5. **Step 4 (Save):** Review the ADC curve and click **Save Calibration Profile**.

---

## 8. Verification & Test Suite

Run the automated integration test suite:
```powershell
cd C:\Users\neela\.gemini\antigravity\scratch\soilsense\backend
python test_api.py
```
This tests all REST endpoints, JSON telemetry payloads, the 8 soil profiles, 25 crop databases, dual-threshold hysteresis transitions, and emergency lockout safety mechanisms.
