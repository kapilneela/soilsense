import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)

DATABASE_PATH = DATA_DIR / "soilsense.db"

# Serial default configuration
DEFAULT_BAUD_RATE = 9600
DEFAULT_SERIAL_PORT = "AUTO"  # Will probe COM ports for Arduino Uno (CH340/FTDI/Uno)
SERIAL_TIMEOUT_SECONDS = 2.0
SERIAL_RECONNECT_INTERVAL_SECONDS = 3.0

# Safety thresholds
MAX_PUMP_CONTINUOUS_RUNTIME_SECONDS = 45  # Safety cutoff for any single watering cycle
MIN_PUMP_RUNTIME_SECONDS = 3             # Minimum pulse to avoid pump motor chattering
MIN_WATERING_INTERVAL_SECONDS = 60       # Enforce at least 60s soak/rest time between cycles
MAX_DAILY_WATERING_SECONDS = 600         # 10 minutes max total pump time per 24 hours
SENSOR_STALE_TIMEOUT_SECONDS = 6.0       # If no sensor data received within 6s, fail safe

# Default calibration fallback (Capacitive sensor: High ADC ~800 = Air/Dry, Low ADC ~350 = Saturated Water)
DEFAULT_AIR_RAW = 820
DEFAULT_DRY_RAW = 750
DEFAULT_WET_RAW = 340
