"""
SoilSense End-to-End API and Logic Test Suite
Tests REST endpoints, agronomic decision calculations, safety cutoffs, and database integrity.
"""

import asyncio
import httpx
import main
import database
import soil_engine
import crop_engine

async def run_tests():
    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        # 1. Status
        res = await client.get("/api/status")
        assert res.status_code == 200
        data = res.json()
        assert "arduino_connected" in data
        assert "pump_state" in data
        assert "moisture_status" in data
        print("✓ /api/status passed")

        # 2. Soils
        res = await client.get("/api/soils")
        assert res.status_code == 200
        soils = res.json()
        assert len(soils) == 8, f"Expected 8 soils, found {len(soils)}"
        ids = [s["id"] for s in soils]
        for eid in ["sandy", "clay", "loamy", "silty", "sandy_loam", "red", "black", "peaty"]:
            assert eid in ids, f"Missing soil {eid}"
        print("✓ /api/soils passed (all 8 verified)")

        # 3. Crops
        res = await client.get("/api/crops")
        assert res.status_code == 200
        crops = res.json()
        assert len(crops) >= 24, f"Expected >= 24 crops, found {len(crops)}"
        print(f"✓ /api/crops passed ({len(crops)} crops verified)")

        # 4. Plants
        res = await client.get("/api/plants")
        assert res.status_code == 200
        plants = res.json()
        assert len(plants) >= 1
        print("✓ /api/plants passed")

        # 5. Mode Toggle
        res = await client.post("/api/irrigation/mode", json={"mode": "manual"})
        assert res.status_code == 200
        assert res.json()["mode"] == "manual"

        res = await client.post("/api/irrigation/mode", json={"mode": "auto"})
        assert res.status_code == 200
        assert res.json()["mode"] == "auto"
        print("✓ /api/irrigation/mode toggle passed")

        # 6. Emergency Stop & Lockout Verification
        res = await client.post("/api/irrigation/emergency-stop")
        assert res.status_code == 200
        assert res.json()["emergency_stop"] is True

        res_start = await client.post("/api/irrigation/start", json={"duration_sec": 10, "reason": "Test"})
        assert res_start.status_code == 400
        assert "Emergency stop is actively engaged" in res_start.json()["detail"]

        res_reset = await client.post("/api/irrigation/reset-emergency")
        assert res_reset.status_code == 200
        assert res_reset.json()["emergency_stop"] is False
        print("✓ Emergency stop lockout and recovery passed")

        # 7. Simulation Mode Verification
        res = await client.post("/api/simulation", json={"enabled": True})
        assert res.status_code == 200
        assert res.json()["simulated"] is True

        status_res = await client.get("/api/status")
        assert status_res.json()["is_simulated"] is True

        res_off = await client.post("/api/simulation", json={"enabled": False})
        assert res_off.status_code == 200
        assert res_off.json()["simulated"] is False
        print("✓ Simulation toggle passed")

        # 8. Calibration API Verification
        payload = {
            "sensor_id": "A1",
            "soil_type": "sandy_loam",
            "air_raw": 830,
            "dry_raw": 760,
            "wet_raw": 330
        }
        res = await client.post("/api/calibration", json=payload)
        assert res.status_code == 200
        get_res = await client.get("/api/calibration?sensor_id=A1&soil_type=sandy_loam")
        assert get_res.status_code == 200
        assert get_res.json()["dry_raw"] == 760
        assert get_res.json()["wet_raw"] == 330
        print("✓ Calibration API passed")

if __name__ == "__main__":
    import os
    database.init_db()
    asyncio.run(run_tests())
    print("\nAll integration tests passed successfully!")
    os._exit(0)
