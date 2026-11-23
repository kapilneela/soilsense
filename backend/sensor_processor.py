"""
SoilSense Sensor Processing Engine
Translates raw analog ADC signals from capacitive soil moisture probes
into a filtered, calibrated Relative Moisture Index (0 - 100%).
Detects open-circuit or disconnected sensor conditions.
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from config import DEFAULT_AIR_RAW, DEFAULT_DRY_RAW, DEFAULT_WET_RAW

class SensorProcessor:
    def __init__(self, alpha: float = 0.3):
        """
        :param alpha: Exponential smoothing factor (0.0 to 1.0). 0.3 provides smooth transitions while responding within ~3s.
        """
        self.alpha = alpha
        self.smoothed_raw: Optional[float] = None
        self.latest_raw: Optional[int] = None
        self.latest_moisture_pct: Optional[float] = None
        self.latest_status: str = "DISCONNECTED"
        self.last_update_time: Optional[datetime] = None

    def process_reading(self, raw_adc: int, calibration: Dict[str, Any]) -> Tuple[float, str]:
        """
        Processes a raw ADC reading from analog pin A1 using specific calibration endpoints.
        Returns: (moisture_percentage, status_string)
        """
        self.latest_raw = raw_adc
        self.last_update_time = datetime.now(timezone.utc)

        # 1. Abnormal and disconnected probe detection
        # Capacitive sensors disconnected on Uno float or pin to VCC (1023) or GND (0)
        if raw_adc >= 1005:
            self.latest_status = "DISCONNECTED_OR_AIR"
            status = "Sensor disconnected or in free air (ADC >= 1005)"
        elif raw_adc <= 20:
            self.latest_status = "SHORT_CIRCUIT"
            status = "Analog short-circuit or grounded lead (ADC <= 20)"
        else:
            self.latest_status = "NORMAL"
            status = "Sensor signal valid"

        # 2. Noise suppression via Exponential Moving Average
        if self.smoothed_raw is None:
            self.smoothed_raw = float(raw_adc)
        else:
            self.smoothed_raw = (self.alpha * float(raw_adc)) + ((1.0 - self.alpha) * self.smoothed_raw)

        # 3. Moisture index computation using calibration profile
        dry_ref = float(calibration.get("dry_raw", DEFAULT_DRY_RAW))
        wet_ref = float(calibration.get("wet_raw", DEFAULT_WET_RAW))

        if abs(dry_ref - wet_ref) < 10.0:
            # Degenerate calibration safety
            pct = 0.0
            status = "Invalid calibration thresholds"
        elif dry_ref > wet_ref:
            # Standard capacitive inverted slope: High ADC = Dry air, Low ADC = Saturated wet soil
            pct = ((dry_ref - self.smoothed_raw) / (dry_ref - wet_ref)) * 100.0
        else:
            # Resistive direct slope: Low ADC = Dry, High ADC = Wet
            pct = ((self.smoothed_raw - dry_ref) / (wet_ref - dry_ref)) * 100.0

        # Clamp between 0.0% and 100.0%
        pct_clamped = round(max(0.0, min(100.0, pct)), 1)
        self.latest_moisture_pct = pct_clamped

        return pct_clamped, status

    def is_stale(self, timeout_seconds: float = 6.0) -> bool:
        if self.last_update_time is None:
            return True
        elapsed = (datetime.now(timezone.utc) - self.last_update_time).total_seconds()
        return elapsed > timeout_seconds

    def reset(self):
        self.smoothed_raw = None
        self.latest_raw = None
        self.latest_moisture_pct = None
        self.latest_status = "DISCONNECTED"
        self.last_update_time = None
