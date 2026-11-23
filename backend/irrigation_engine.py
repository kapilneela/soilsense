"""
SoilSense Intelligent Irrigation Engine
Combines real-time soil moisture, soil hydraulics, crop transpiration characteristics,
phenological growth stage requirements, and safety hysteresis to determine automated
irrigation actions and recommendations.
"""

from typing import Optional, Dict, Any, Tuple
import soil_engine
import crop_engine

class IrrigationEngine:
    def __init__(self, pump_controller):
        self.pump_controller = pump_controller

    def evaluate(
        self,
        current_moisture: Optional[float],
        sensor_status: str,
        is_sensor_stale: bool,
        plant_config: Optional[Dict[str, Any]],
        mode: str = "auto"
    ) -> Tuple[str, str, str]:
        """
        Evaluates current conditions and performs automatic pump control if mode == 'auto'.
        Returns: (recommendation_text, moisture_status_category, action_taken)
        """
        # Safety Check 1: Emergency Stop
        if self.pump_controller.emergency_stop_engaged:
            if self.pump_controller.is_pump_on():
                self.pump_controller.stop_pump(reason="Emergency Stop Lockout", end_moisture=current_moisture, status="emergency_stopped")
            return "Emergency stop is engaged. All irrigation is safely locked out.", "LOCKED", "emergency_off"

        # Safety Check 2: Sensor Health
        if current_moisture is None or is_sensor_stale or "DISCONNECTED" in sensor_status.upper():
            if self.pump_controller.is_pump_on():
                self.pump_controller.stop_pump(reason="Sensor data unavailable or disconnected", end_moisture=current_moisture, status="sensor_fail_safe")
                return "Sensor reading disconnected or stale. Pump cut off for plant and hardware safety.", "DISCONNECTED", "stopped"
            return "Soil sensor disconnected or waiting for initial USB telemetry. Pump is kept safe in OFF state.", "DISCONNECTED", "none"

        # Check plant configuration
        if not plant_config:
            return "No active plant configuration selected. Please create or activate a plant profile.", "CONFIG_REQUIRED", "none"

        soil_id = plant_config.get("soil_id", "loamy")
        crop_id = plant_config.get("crop_id", "tomato")
        stage_name = plant_config.get("growth_stage", "Vegetative")

        soil_prof = soil_engine.get_soil_by_id(soil_id)
        crop_prof = crop_engine.get_crop_by_id(crop_id)

        target_moist = float(plant_config.get("target_moisture_pct", 65.0))
        min_moist = float(plant_config.get("min_moisture_pct", 45.0))
        max_moist = float(plant_config.get("max_moisture_pct", 85.0))
        max_duration = int(plant_config.get("max_irrigation_duration_sec", 30))

        crop_name = crop_prof.name if crop_prof else crop_id.capitalize()
        soil_name = soil_prof.name if soil_prof else soil_id.capitalize()

        # Categorize moisture status
        if current_moisture < min_moist - 15.0:
            moisture_cat = "CRITICAL_DRY"
        elif current_moisture < min_moist:
            moisture_cat = "DRY"
        elif current_moisture > max_moist:
            moisture_cat = "WET"
        else:
            moisture_cat = "OPTIMAL"

        # Hysteresis Execution Loop
        is_pump_running = self.pump_controller.is_pump_on()
        action_taken = "none"

        if is_pump_running:
            # PUMP IS CURRENTLY RUNNING: Test deactivation criteria
            current_runtime = self.pump_controller.get_runtime_sec()

            if current_moisture >= target_moist:
                # Target achieved
                reason = f"Target moisture achieved ({current_moisture:.1f}% >= target {target_moist:.1f}%)"
                if mode == "auto":
                    self.pump_controller.stop_pump(reason=reason, end_moisture=current_moisture, status="completed")
                    action_taken = "stopped"
                recommendation = f"Target soil moisture ({target_moist:.0f}%) reached for {crop_name}. Irrigation stopped to prevent oversaturation."

            elif current_runtime >= max_duration:
                # Configured profile duration reached
                reason = f"Configured profile cycle duration of {max_duration}s completed"
                if mode == "auto":
                    self.pump_controller.stop_pump(reason=reason, end_moisture=current_moisture, status="completed")
                    action_taken = "stopped"
                recommendation = f"Cycle limit of {max_duration}s reached. Allowing {soil_name} water infiltration to equilibrate."

            else:
                remaining_sec = max_duration - current_runtime
                recommendation = f"Watering in progress ({current_runtime}s / {max_duration}s). Current moisture: {current_moisture:.1f}% -> Target: {target_moist:.1f}%."

        else:
            # PUMP IS CURRENTLY OFF: Test activation criteria
            if current_moisture < min_moist:
                deficit = min_moist - current_moisture
                reason = (f"Moisture deficit: {current_moisture:.1f}% is below minimum threshold of {min_moist:.1f}% "
                          f"for {crop_name} at {stage_name} stage in {soil_name}.")

                if mode == "auto":
                    can_start, msg = self.pump_controller.can_start_irrigation()
                    if can_start:
                        started, start_msg = self.pump_controller.start_pump(
                            trigger_type="auto",
                            reason=reason,
                            current_moisture=current_moisture
                        )
                        if started:
                            action_taken = "started"
                            recommendation = f"Automatic irrigation activated: {crop_name} ({stage_name}) requires moisture replenishment."
                        else:
                            recommendation = f"Irrigation needed ({deficit:.1f}% deficit), but delayed: {start_msg}"
                    else:
                        recommendation = f"Irrigation needed ({deficit:.1f}% deficit), but deferred: {msg}"
                else:
                    recommendation = f"Moisture ({current_moisture:.1f}%) is below minimum ({min_moist:.1f}%). System is in MANUAL mode: irrigation recommended."

            elif current_moisture >= max_moist:
                recommendation = f"Soil moisture ({current_moisture:.1f}%) exceeds upper bound ({max_moist:.1f}%). Ensure proper aeration and avoid watering."
            else:
                recommendation = f"Soil moisture ({current_moisture:.1f}%) is in optimal range ({min_moist:.0f}% - {target_moist:.0f}%) for {crop_name} ({stage_name})."

        return recommendation, moisture_cat, action_taken
