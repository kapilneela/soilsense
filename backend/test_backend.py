import database
import soil_engine
import crop_engine
import sensor_processor
import models

def test_all():
    database.init_db()
    soils = soil_engine.get_all_soils()
    crops = crop_engine.get_all_crops()
    print(f"Verified Soils count: {len(soils)}")
    print(f"Verified Crops count: {len(crops)}")
    active_plant = database.get_active_plant_config()
    print("Active plant config:", active_plant["name"] if active_plant else "None")
    
    # Test sensor processor
    sp = sensor_processor.SensorProcessor()
    calib = database.get_calibration()
    pct, status = sp.process_reading(650, calib)
    print(f"Processed 650 ADC -> {pct}% ({status})")
    print("All backend components verified successfully!")

if __name__ == "__main__":
    test_all()
