from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class GrowthStageRequirement(BaseModel):
    stage_name: str
    description: str
    duration_days_min: int
    duration_days_max: int
    moisture_target_pct: float
    moisture_min_pct: float
    moisture_max_pct: float
    irrigation_frequency_advice: str
    water_stress_impact: str

class SoilProfile(BaseModel):
    id: str
    name: str
    description: str
    particle_characteristics: str
    water_retention_capacity: str
    drainage_characteristics: str
    aeration_characteristics: str
    fertility_characteristics: str
    organic_matter: str
    common_applications: str
    advantages: List[str]
    limitations: List[str]
    suitable_crops: List[str]
    irrigation_considerations: str
    field_capacity_pct: float
    wilting_point_pct: float

class CropProfile(BaseModel):
    id: str
    name: str
    scientific_name: str
    category: str  # "Cereals", "Vegetables", "Fruits", "Commercial crops"
    description: str
    suitable_soils: List[str]
    preferred_ph_range: str
    water_requirement_mm: str
    root_depth_info: str
    irrigation_method: str
    temperature_range: str
    growth_duration_days: str
    growth_stages: List[GrowthStageRequirement]
    npk_ratio: str
    common_problems: List[str]
    overwatering_risks: List[str]
    underwatering_risks: List[str]

class PlantConfigCreate(BaseModel):
    name: str = "My Field Crop"
    soil_id: str
    crop_id: str
    variety: Optional[str] = "Standard"
    growth_stage: str = "Vegetative"
    planting_date: Optional[str] = None
    expected_harvest_date: Optional[str] = None
    plant_count: Optional[int] = 1
    cultivation_area_sqm: Optional[float] = 1.0
    cultivation_type: str = "open-field"  # "container" or "open-field"
    irrigation_method: str = "Drip"
    target_moisture_pct: float = 65.0
    min_moisture_pct: float = 45.0
    max_moisture_pct: float = 85.0
    max_irrigation_duration_sec: int = 30
    air_temp: Optional[float] = None
    air_humidity: Optional[float] = None
    rainfall: Optional[float] = None
    sunlight_exposure: Optional[str] = "Full sun"
    soil_ph: Optional[float] = None
    soil_temp: Optional[float] = None
    is_active: bool = True

class PlantConfig(PlantConfigCreate):
    id: int
    created_at: str

class CalibrationUpdate(BaseModel):
    sensor_id: str = "A1"
    soil_type: Optional[str] = "general"
    air_raw: int = Field(..., ge=0, le=1023)
    dry_raw: int = Field(..., ge=0, le=1023)
    wet_raw: int = Field(..., ge=0, le=1023)

class CalibrationModel(BaseModel):
    id: int
    sensor_id: str
    soil_type: str
    air_raw: int
    dry_raw: int
    wet_raw: int
    updated_at: str

class IrrigationModeUpdate(BaseModel):
    mode: str  # "auto" or "manual"

class ManualIrrigationCommand(BaseModel):
    duration_sec: int = Field(10, ge=1, le=120)
    reason: str = "User manual trigger via web interface"

class SerialPortConfig(BaseModel):
    port: str  # e.g., "COM3" or "AUTO"

class SystemStatus(BaseModel):
    arduino_connected: bool
    port: Optional[str]
    available_ports: List[str]
    raw_adc: Optional[int]
    moisture_index_pct: Optional[float]
    moisture_status: str  # "OPTIMAL", "DRY", "CRITICAL_DRY", "WET", "DISCONNECTED", "CALIBRATION_NEEDED"
    pump_state: str  # "ON" or "OFF"
    pump_runtime_sec: int
    mode: str  # "auto" or "manual"
    irrigation_recommendation: str
    safety_status: str
    active_plant: Optional[Dict[str, Any]]
    active_soil: Optional[Dict[str, Any]]
    active_crop: Optional[Dict[str, Any]]
    last_sensor_timestamp: Optional[str]
    daily_watering_total_sec: int
    emergency_stop: bool
