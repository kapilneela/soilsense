"""
SoilSense Database Layer
Handles SQLite persistence for sensor history, irrigation logs, plant profiles,
calibration records, and system settings.
"""

import sqlite3
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from config import DATABASE_PATH, DEFAULT_AIR_RAW, DEFAULT_DRY_RAW, DEFAULT_WET_RAW

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Plant Configurations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS plant_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        soil_id TEXT NOT NULL,
        crop_id TEXT NOT NULL,
        variety TEXT,
        growth_stage TEXT NOT NULL,
        planting_date TEXT,
        expected_harvest_date TEXT,
        plant_count INTEGER DEFAULT 1,
        cultivation_area_sqm REAL DEFAULT 1.0,
        cultivation_type TEXT DEFAULT 'open-field',
        irrigation_method TEXT DEFAULT 'Drip',
        target_moisture_pct REAL DEFAULT 65.0,
        min_moisture_pct REAL DEFAULT 45.0,
        max_moisture_pct REAL DEFAULT 85.0,
        max_irrigation_duration_sec INTEGER DEFAULT 30,
        air_temp REAL,
        air_humidity REAL,
        rainfall REAL,
        sunlight_exposure TEXT,
        soil_ph REAL,
        soil_temp REAL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Sensor Readings History table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        raw_adc INTEGER NOT NULL,
        moisture_index_pct REAL,
        pin TEXT DEFAULT 'A1',
        sensor_status TEXT DEFAULT 'ok'
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_time ON sensor_readings(timestamp)")

    # Irrigation Activity Logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS irrigation_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        trigger_type TEXT NOT NULL,
        duration_sec INTEGER NOT NULL,
        starting_moisture REAL,
        ending_moisture REAL,
        status TEXT NOT NULL,
        reason TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_irrigation_time ON irrigation_events(timestamp)")

    # Calibrations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS calibrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT NOT NULL,
        soil_type TEXT NOT NULL,
        air_raw INTEGER NOT NULL,
        dry_raw INTEGER NOT NULL,
        wet_raw INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(sensor_id, soil_type)
    )
    """)

    # System Settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Seed default calibration if empty
    cursor.execute("SELECT COUNT(*) FROM calibrations")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO calibrations (sensor_id, soil_type, air_raw, dry_raw, wet_raw, updated_at)
        VALUES ('A1', 'general', ?, ?, ?, ?)
        """, (DEFAULT_AIR_RAW, DEFAULT_DRY_RAW, DEFAULT_WET_RAW, now_str))

    # Seed initial default plant config if none exists
    cursor.execute("SELECT COUNT(*) FROM plant_configs")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
        INSERT INTO plant_configs (
            name, soil_id, crop_id, variety, growth_stage,
            planting_date, expected_harvest_date, plant_count, cultivation_area_sqm,
            cultivation_type, irrigation_method, target_moisture_pct, min_moisture_pct,
            max_moisture_pct, max_irrigation_duration_sec, air_temp, air_humidity,
            rainfall, sunlight_exposure, soil_ph, soil_temp, is_active, created_at
        ) VALUES (
            'Demonstration Plot - Field 1', 'sandy_loam', 'tomato', 'Roma VF', 'Flowering',
            '2026-10-15', '2027-01-30', 24, 15.0,
            'open-field', 'Drip', 70.0, 50.0, 85.0, 30,
            26.5, 58.0, 0.0, 'Full sun', 6.5, 23.0, 1, ?
        )
        """, (now_str,))

    # Seed default irrigation mode
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('mode', 'auto')")
    cursor.execute("INSERT OR IGNORE INTO system_settings (key, value) VALUES ('emergency_stop', 'false')")

    conn.commit()
    conn.close()

# Sensor Readings operations
def insert_sensor_reading(raw_adc: int, moisture_pct: Optional[float], pin="A1", status="ok"):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO sensor_readings (timestamp, raw_adc, moisture_index_pct, pin, sensor_status)
    VALUES (?, ?, ?, ?, ?)
    """, (now_str, raw_adc, moisture_pct, pin, status))
    conn.commit()
    conn.close()

def get_recent_sensor_readings(limit: int = 60) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT timestamp, raw_adc, moisture_index_pct, pin, sensor_status
    FROM sensor_readings
    ORDER BY id DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in reversed(rows)]

def get_sensor_history_by_range(hours: int = 24) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    # In SQLite, query with datetime filter
    cursor.execute("""
    SELECT timestamp, raw_adc, moisture_index_pct, pin, sensor_status
    FROM sensor_readings
    WHERE timestamp >= datetime('now', '-' || ? || ' hours')
    ORDER BY id ASC
    """, (hours,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Irrigation Event operations
def log_irrigation_event(trigger_type: str, duration_sec: int, start_moist: Optional[float], end_moist: Optional[float], status: str, reason: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO irrigation_events (timestamp, trigger_type, duration_sec, starting_moisture, ending_moisture, status, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (now_str, trigger_type, duration_sec, start_moist, end_moist, status, reason))
    conn.commit()
    conn.close()

def get_recent_irrigation_events(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, timestamp, trigger_type, duration_sec, starting_moisture, ending_moisture, status, reason
    FROM irrigation_events
    ORDER BY id DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_daily_irrigation_seconds() -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT COALESCE(SUM(duration_sec), 0)
    FROM irrigation_events
    WHERE timestamp >= datetime('now', '-24 hours') AND status = 'completed'
    """)
    total = cursor.fetchone()[0]
    conn.close()
    return int(total)

# Plant Configurations operations
def get_active_plant_config() -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plant_configs WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_all_plant_configs() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM plant_configs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def create_plant_config(data: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    # If is_active, set others to 0
    if data.get("is_active", True):
        cursor.execute("UPDATE plant_configs SET is_active = 0")

    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO plant_configs (
        name, soil_id, crop_id, variety, growth_stage,
        planting_date, expected_harvest_date, plant_count, cultivation_area_sqm,
        cultivation_type, irrigation_method, target_moisture_pct, min_moisture_pct,
        max_moisture_pct, max_irrigation_duration_sec, air_temp, air_humidity,
        rainfall, sunlight_exposure, soil_ph, soil_temp, is_active, created_at
    ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
    )
    """, (
        data.get("name", "Field Crop"),
        data.get("soil_id", "loamy"),
        data.get("crop_id", "tomato"),
        data.get("variety", "Standard"),
        data.get("growth_stage", "Vegetative"),
        data.get("planting_date"),
        data.get("expected_harvest_date"),
        data.get("plant_count", 1),
        data.get("cultivation_area_sqm", 1.0),
        data.get("cultivation_type", "open-field"),
        data.get("irrigation_method", "Drip"),
        data.get("target_moisture_pct", 65.0),
        data.get("min_moisture_pct", 45.0),
        data.get("max_moisture_pct", 85.0),
        data.get("max_irrigation_duration_sec", 30),
        data.get("air_temp"),
        data.get("air_humidity"),
        data.get("rainfall"),
        data.get("sunlight_exposure", "Full sun"),
        data.get("soil_ph"),
        data.get("soil_temp"),
        1 if data.get("is_active", True) else 0,
        now_str
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_plant_config(config_id: int, data: Dict[str, Any]) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    if data.get("is_active"):
        cursor.execute("UPDATE plant_configs SET is_active = 0 WHERE id != ?", (config_id,))

    cursor.execute("""
    UPDATE plant_configs SET
        name = ?, soil_id = ?, crop_id = ?, variety = ?, growth_stage = ?,
        planting_date = ?, expected_harvest_date = ?, plant_count = ?, cultivation_area_sqm = ?,
        cultivation_type = ?, irrigation_method = ?, target_moisture_pct = ?, min_moisture_pct = ?,
        max_moisture_pct = ?, max_irrigation_duration_sec = ?, air_temp = ?, air_humidity = ?,
        rainfall = ?, sunlight_exposure = ?, soil_ph = ?, soil_temp = ?, is_active = ?
    WHERE id = ?
    """, (
        data.get("name"),
        data.get("soil_id"),
        data.get("crop_id"),
        data.get("variety"),
        data.get("growth_stage"),
        data.get("planting_date"),
        data.get("expected_harvest_date"),
        data.get("plant_count"),
        data.get("cultivation_area_sqm"),
        data.get("cultivation_type"),
        data.get("irrigation_method"),
        data.get("target_moisture_pct"),
        data.get("min_moisture_pct"),
        data.get("max_moisture_pct"),
        data.get("max_irrigation_duration_sec"),
        data.get("air_temp"),
        data.get("air_humidity"),
        data.get("rainfall"),
        data.get("sunlight_exposure"),
        data.get("soil_ph"),
        data.get("soil_temp"),
        1 if data.get("is_active", True) else 0,
        config_id
    ))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

def delete_plant_config(config_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM plant_configs WHERE id = ?", (config_id,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected

# Calibration operations
def get_calibration(sensor_id="A1", soil_type="general") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM calibrations WHERE sensor_id = ? AND soil_type = ?
    """, (sensor_id, soil_type))
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM calibrations WHERE sensor_id = ? LIMIT 1", (sensor_id,))
        row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return {
        "id": 0,
        "sensor_id": sensor_id,
        "soil_type": soil_type,
        "air_raw": DEFAULT_AIR_RAW,
        "dry_raw": DEFAULT_DRY_RAW,
        "wet_raw": DEFAULT_WET_RAW,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

def save_calibration(sensor_id: str, soil_type: str, air_raw: int, dry_raw: int, wet_raw: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
    INSERT INTO calibrations (sensor_id, soil_type, air_raw, dry_raw, wet_raw, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(sensor_id, soil_type) DO UPDATE SET
        air_raw = excluded.air_raw,
        dry_raw = excluded.dry_raw,
        wet_raw = excluded.wet_raw,
        updated_at = excluded.updated_at
    """, (sensor_id, soil_type, air_raw, dry_raw, wet_raw, now_str))
    conn.commit()
    conn.close()

# System settings operations
def get_system_setting(key: str, default: str = "") -> str:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_system_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO system_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
    """, (key, value))
    conn.commit()
    conn.close()
