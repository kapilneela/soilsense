"""
SoilSense Pump Controller
Enforces strict hardware safety boundaries, runtime limits, cooldowns,
and records all watering cycles to the database.
"""

import time
from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from config import (
    MAX_PUMP_CONTINUOUS_RUNTIME_SECONDS,
    MIN_PUMP_RUNTIME_SECONDS,
    MIN_WATERING_INTERVAL_SECONDS,
    MAX_DAILY_WATERING_SECONDS
)
import database

class PumpController:
    def __init__(self, arduino_manager):
        self.arduino = arduino_manager
        self.state: str = "OFF"  # "ON" or "OFF"
        self.start_time: Optional[float] = None
        self.last_off_time: float = 0.0
        self.trigger_type: str = "manual"  # "auto" or "manual"
        self.start_moisture: Optional[float] = None
        self.trigger_reason: str = ""
        self.emergency_stop_engaged: bool = False

    def is_pump_on(self) -> bool:
        return self.state == "ON" or self.arduino.latest_pump_state == "ON"

    def get_runtime_sec(self) -> int:
        if self.state == "ON" and self.start_time is not None:
            return int(time.time() - self.start_time)
        return 0

    def can_start_irrigation(self) -> Tuple[bool, str]:
        if self.emergency_stop_engaged:
            return False, "Emergency stop is actively engaged. Reset emergency stop first."

        if not self.arduino.is_connected:
            return False, "Arduino hardware is not connected."

        if self.is_pump_on():
            return False, "Pump is already running."

        # Check cooldown between cycles
        elapsed_since_last_off = time.time() - self.last_off_time
        if elapsed_since_last_off < MIN_WATERING_INTERVAL_SECONDS:
            remaining = int(MIN_WATERING_INTERVAL_SECONDS - elapsed_since_last_off)
            return False, f"Cooldown in progress: {remaining}s remaining before next irrigation cycle."

        # Check daily limit
        daily_used = database.get_daily_irrigation_seconds()
        if daily_used >= MAX_DAILY_WATERING_SECONDS:
            return False, f"Maximum daily watering limit reached ({daily_used}s / {MAX_DAILY_WATERING_SECONDS}s)."

        return True, "Ready"

    def start_pump(self, trigger_type: str, reason: str, current_moisture: Optional[float] = None) -> Tuple[bool, str]:
        can_start, msg = self.can_start_irrigation()
        if not can_start:
            return False, msg

        success = self.arduino.send_pump_command("ON")
        if success:
            self.state = "ON"
            self.start_time = time.time()
            self.trigger_type = trigger_type
            self.start_moisture = current_moisture
            self.trigger_reason = reason
            return True, "Pump activated successfully."
        else:
            return False, "Failed to send ON command to hardware."

    def stop_pump(self, reason: str, end_moisture: Optional[float] = None, status: str = "completed") -> Tuple[bool, str]:
        runtime = self.get_runtime_sec()

        # If pump is stopping, send OFF to hardware
        self.arduino.send_pump_command("OFF")
        was_on = (self.state == "ON")
        self.state = "OFF"
        self.last_off_time = time.time()

        if was_on and self.start_time is not None:
            # Log event to database
            database.log_irrigation_event(
                trigger_type=self.trigger_type,
                duration_sec=runtime,
                start_moist=self.start_moisture,
                end_moist=end_moisture,
                status=status,
                reason=reason or self.trigger_reason
            )

        self.start_time = None
        return True, "Pump stopped."

    def emergency_stop(self) -> Tuple[bool, str]:
        self.emergency_stop_engaged = True
        self.stop_pump(reason="Emergency Stop Manually Triggered", status="emergency_stopped")
        database.set_system_setting("emergency_stop", "true")
        return True, "EMERGENCY STOP ACTIVATED: Pump immediately cut off and locked."

    def reset_emergency_stop(self) -> Tuple[bool, str]:
        self.emergency_stop_engaged = False
        database.set_system_setting("emergency_stop", "false")
        return True, "Emergency stop reset. System returned to standby."

    def check_safety_watchdog(self, current_moisture: Optional[float] = None) -> Optional[str]:
        """Called regularly by background worker to enforce maximum run times."""
        if self.state == "ON" and self.start_time is not None:
            runtime = time.time() - self.start_time
            if runtime >= MAX_PUMP_CONTINUOUS_RUNTIME_SECONDS:
                self.stop_pump(
                    reason=f"Exceeded max safety runtime limit of {MAX_PUMP_CONTINUOUS_RUNTIME_SECONDS}s",
                    end_moisture=current_moisture,
                    status="timeout_cutoff"
                )
                return f"Pump automatically terminated: reached continuous limit of {MAX_PUMP_CONTINUOUS_RUNTIME_SECONDS}s"
        return None
