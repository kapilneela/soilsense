"""
SoilSense FastAPI Application
Central hardware gateway, real-time agronomic decision engine, and WebSocket broadcaster.
"""

import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import List, Set, Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
import database
import models
import soil_engine
import crop_engine
from arduino_manager import ArduinoManager
from sensor_processor import SensorProcessor
from pump_controller import PumpController
from irrigation_engine import IrrigationEngine

# Logging configuration
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("SoilSense")

# Singletons
arduino_mgr = ArduinoManager(port=config.DEFAULT_SERIAL_PORT, baud_rate=config.DEFAULT_BAUD_RATE)
sensor_proc = SensorProcessor(alpha=0.3)
pump_ctrl = PumpController(arduino_mgr)
irrigation_eng = IrrigationEngine(pump_ctrl)

# Connected WebSocket clients
active_websockets: Set[WebSocket] = set()

# State variables
current_mode = "auto"
last_recommendation = "Initializing system..."
last_moisture_category = "OPTIMAL"

# Lifespan manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SoilSense Database...")
    database.init_db()

    global current_mode
    current_mode = database.get_system_setting("mode", "auto")
    emergency = database.get_system_setting("emergency_stop", "false") == "true"
    pump_ctrl.emergency_stop_engaged = emergency

    # Setup Arduino Callbacks
    def on_sensor(data: Dict[str, Any]):
        raw_adc = data.get("raw")
        if raw_adc is not None:
            # Look up calibration for active plant's soil
            active_plant = database.get_active_plant_config()
            soil_id = active_plant.get("soil_id", "general") if active_plant else "general"
            calib = database.get_calibration(sensor_id="A1", soil_type=soil_id)

            pct, status = sensor_proc.process_reading(raw_adc, calib)
            # Log to DB periodically or on valid reading
            database.insert_sensor_reading(raw_adc=raw_adc, moisture_pct=pct, pin="A1", status=status)

    def on_pump(data: Dict[str, Any]):
        state = data.get("state", "OFF")
        pump_ctrl.state = state

    arduino_mgr.on_sensor_data = on_sensor
    arduino_mgr.on_pump_status = on_pump

    logger.info("Starting Arduino Serial Manager background worker...")
    arduino_mgr.start()

    # Start asyncio background task for continuous evaluation & WebSocket broadcast
    worker_task = asyncio.create_task(_system_tick_loop())

    yield

    logger.info("Shutting down SoilSense...")
    worker_task.cancel()
    pump_ctrl.stop_pump("Server Shutdown")
    arduino_mgr.stop()

app = FastAPI(title="SoilSense API", version="1.0.0", lifespan=lifespan)

# Allow CORS for development (Vite typically runs on 5173 or local network)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def _system_tick_loop():
    """Continuous 1-second control and broadcast loop."""
    global last_recommendation, last_moisture_category
    while True:
        try:
            await asyncio.sleep(1.0)

            # Check pump safety timeout
            safety_alert = pump_ctrl.check_safety_watchdog(sensor_proc.latest_moisture_pct)

            # Active plant profile
            active_plant = database.get_active_plant_config()

            # Irrigation engine evaluation
            recommendation, moisture_cat, action = irrigation_eng.evaluate(
                current_moisture=sensor_proc.latest_moisture_pct,
                sensor_status=sensor_proc.latest_status,
                is_sensor_stale=sensor_proc.is_stale(config.SENSOR_STALE_TIMEOUT_SECONDS),
                plant_config=active_plant,
                mode=current_mode
            )

            last_recommendation = recommendation
            last_moisture_category = moisture_cat

            # Prepare broadcast payload
            payload = _build_status_dict(active_plant)

            # Broadcast to all connected WebSocket clients
            if active_websockets:
                msg_str = json.dumps(payload)
                dead_sockets = set()
                for ws in list(active_websockets):
                    try:
                        await ws.send_text(msg_str)
                    except Exception:
                        dead_sockets.add(ws)
                for ws in dead_sockets:
                    active_websockets.discard(ws)

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error in system loop: {e}", exc_info=True)

def _build_status_dict(active_plant: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    if active_plant is None:
        active_plant = database.get_active_plant_config()

    soil_info = None
    crop_info = None
    if active_plant:
        soil_prof = soil_engine.get_soil_by_id(active_plant.get("soil_id", ""))
        crop_prof = crop_engine.get_crop_by_id(active_plant.get("crop_id", ""))
        if soil_prof:
            soil_info = soil_prof.dict()
        if crop_prof:
            crop_info = crop_prof.dict()

    available_ports = [p["port"] for p in arduino_mgr.get_available_ports()]

    # Hardware connection status:
    # If simulated_mode is active, explicitly mark it as simulated
    is_hardware_connected = arduino_mgr.is_connected and not arduino_mgr.simulated_mode

    return {
        "type": "telemetry",
        "arduino_connected": is_hardware_connected,
        "is_simulated": arduino_mgr.simulated_mode,
        "port": arduino_mgr.actual_port or arduino_mgr.requested_port,
        "available_ports": available_ports,
        "raw_adc": sensor_proc.latest_raw,
        "moisture_index_pct": sensor_proc.latest_moisture_pct,
        "moisture_status": last_moisture_category,
        "pump_state": "ON" if pump_ctrl.is_pump_on() else "OFF",
        "pump_runtime_sec": pump_ctrl.get_runtime_sec(),
        "mode": current_mode,
        "irrigation_recommendation": last_recommendation,
        "safety_status": "LOCKED" if pump_ctrl.emergency_stop_engaged else ("RUNNING" if pump_ctrl.is_pump_on() else "STANDBY"),
        "emergency_stop": pump_ctrl.emergency_stop_engaged,
        "daily_watering_total_sec": database.get_daily_irrigation_seconds(),
        "active_plant": active_plant,
        "active_soil": soil_info,
        "active_crop": crop_info,
        "last_sensor_timestamp": sensor_proc.last_update_time.isoformat() if sensor_proc.last_update_time else None
    }

# ================= REST API ENDPOINTS =================

@app.get("/api/status")
async def get_system_status():
    return _build_status_dict()

@app.get("/api/sensor/latest")
async def get_latest_sensor():
    return {
        "raw_adc": sensor_proc.latest_raw,
        "moisture_index_pct": sensor_proc.latest_moisture_pct,
        "status": sensor_proc.latest_status,
        "is_stale": sensor_proc.is_stale(config.SENSOR_STALE_TIMEOUT_SECONDS),
        "timestamp": sensor_proc.last_update_time.isoformat() if sensor_proc.last_update_time else None
    }

@app.get("/api/sensor/history")
async def get_sensor_history(hours: int = Query(24, ge=1, le=168)):
    return database.get_sensor_history_by_range(hours=hours)

# Soils endpoints
@app.get("/api/soils")
async def get_all_soils():
    return [s.dict() for s in soil_engine.get_all_soils()]

@app.get("/api/soils/{soil_id}")
async def get_soil(soil_id: str):
    soil = soil_engine.get_soil_by_id(soil_id)
    if not soil:
        raise HTTPException(status_code=404, detail="Soil type not found")
    return soil.dict()

# Crops endpoints
@app.get("/api/crops")
async def get_all_crops(category: Optional[str] = None):
    if category:
        return [c.dict() for c in crop_engine.get_crops_by_category(category)]
    return [c.dict() for c in crop_engine.get_all_crops()]

@app.get("/api/crops/{crop_id}")
async def get_crop(crop_id: str):
    crop = crop_engine.get_crop_by_id(crop_id)
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found")
    return crop.dict()

# Plant Configuration endpoints
@app.get("/api/plants")
async def get_plants():
    return database.get_all_plant_configs()

@app.get("/api/plants/active")
async def get_active_plant():
    plant = database.get_active_plant_config()
    if not plant:
        raise HTTPException(status_code=404, detail="No active plant configuration")
    return plant

@app.post("/api/plants")
async def create_plant(config_data: models.PlantConfigCreate):
    new_id = database.create_plant_config(config_data.dict())
    return {"id": new_id, "message": "Plant configuration created successfully."}

@app.put("/api/plants/{plant_id}")
async def update_plant(plant_id: int, config_data: models.PlantConfigCreate):
    success = database.update_plant_config(plant_id, config_data.dict())
    if not success:
        raise HTTPException(status_code=404, detail="Plant configuration not found")
    return {"message": "Plant configuration updated successfully."}

@app.delete("/api/plants/{plant_id}")
async def delete_plant(plant_id: int):
    success = database.delete_plant_config(plant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Plant configuration not found")
    return {"message": "Plant configuration deleted."}

@app.post("/api/plants/{plant_id}/activate")
async def activate_plant(plant_id: int):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE plant_configs SET is_active = 0")
    cursor.execute("UPDATE plant_configs SET is_active = 1 WHERE id = ?", (plant_id,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not affected:
        raise HTTPException(status_code=404, detail="Plant configuration not found")
    return {"message": "Plant configuration activated."}

# Irrigation Control endpoints
@app.get("/api/irrigation/status")
async def get_irrigation_status():
    return {
        "pump_state": "ON" if pump_ctrl.is_pump_on() else "OFF",
        "runtime_sec": pump_ctrl.get_runtime_sec(),
        "mode": current_mode,
        "emergency_stop": pump_ctrl.emergency_stop_engaged,
        "daily_total_sec": database.get_daily_irrigation_seconds(),
        "recommendation": last_recommendation
    }

@app.post("/api/irrigation/mode")
async def set_irrigation_mode(payload: models.IrrigationModeUpdate):
    global current_mode
    mode = payload.mode.lower()
    if mode not in ["auto", "manual"]:
        raise HTTPException(status_code=400, detail="Mode must be 'auto' or 'manual'")
    current_mode = mode
    database.set_system_setting("mode", mode)
    return {"mode": current_mode, "message": f"Irrigation mode switched to {current_mode.upper()}."}

@app.post("/api/irrigation/start")
async def start_manual_irrigation(payload: models.ManualIrrigationCommand):
    success, msg = pump_ctrl.start_pump(
        trigger_type="manual",
        reason=payload.reason,
        current_moisture=sensor_proc.latest_moisture_pct
    )
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg, "pump_state": "ON"}

@app.post("/api/irrigation/stop")
async def stop_manual_irrigation():
    success, msg = pump_ctrl.stop_pump(
        reason="Manual user stop command",
        end_moisture=sensor_proc.latest_moisture_pct,
        status="completed"
    )
    return {"message": msg, "pump_state": "OFF"}

@app.post("/api/irrigation/emergency-stop")
async def trigger_emergency_stop():
    success, msg = pump_ctrl.emergency_stop()
    return {"message": msg, "emergency_stop": True}

@app.post("/api/irrigation/reset-emergency")
async def reset_emergency():
    success, msg = pump_ctrl.reset_emergency_stop()
    return {"message": msg, "emergency_stop": False}

@app.get("/api/irrigation/history")
async def get_irrigation_history(limit: int = Query(20, ge=1, le=100)):
    return database.get_recent_irrigation_events(limit=limit)

# Calibration endpoints
@app.get("/api/calibration")
async def get_calibration_values(sensor_id: str = "A1", soil_type: str = "general"):
    return database.get_calibration(sensor_id=sensor_id, soil_type=soil_type)

@app.post("/api/calibration")
async def set_calibration_values(payload: models.CalibrationUpdate):
    database.save_calibration(
        sensor_id=payload.sensor_id,
        soil_type=payload.soil_type or "general",
        air_raw=payload.air_raw,
        dry_raw=payload.dry_raw,
        wet_raw=payload.wet_raw
    )
    return {"message": "Calibration values saved successfully."}

# Hardware Serial Ports endpoints
@app.get("/api/ports")
async def get_ports():
    return {
        "ports": arduino_mgr.get_available_ports(),
        "selected_port": arduino_mgr.requested_port,
        "actual_port": arduino_mgr.actual_port,
        "is_connected": arduino_mgr.is_connected,
        "is_simulated": arduino_mgr.simulated_mode
    }

@app.post("/api/ports")
async def set_port(payload: models.SerialPortConfig):
    arduino_mgr.set_port(payload.port)
    return {"message": f"Serial port set to {payload.port}. Reconnecting..."}

class SimulationToggle(BaseModel):
    enabled: bool

@app.post("/api/simulation")
async def toggle_simulation(payload: SimulationToggle):
    arduino_mgr.set_simulated_mode(payload.enabled)
    return {
        "simulated": payload.enabled,
        "message": "Virtual Hardware Simulation Mode " + ("ENABLED" if payload.enabled else "DISABLED")
    }

# WebSocket Endpoint
@app.websocket("/ws/live")
async def websocket_live_feed(websocket: WebSocket):
    await websocket.accept()
    active_websockets.add(websocket)
    # Immediately send current state on connect
    try:
        initial_payload = _build_status_dict()
        await websocket.send_text(json.dumps(initial_payload))
        while True:
            # Client can send pings or command messages
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                if cmd.get("action") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        active_websockets.discard(websocket)
    except Exception:
        active_websockets.discard(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
