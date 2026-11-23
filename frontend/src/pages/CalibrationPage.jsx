import React, { useState, useEffect } from 'react';
import { 
  Wrench, Usb, Cpu, CheckCircle2, AlertTriangle, RefreshCw, 
  ArrowRight, ShieldAlert, Save, Info, Sliders 
} from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const CalibrationPage = () => {
  const { status, showToast, refreshStatus, toggleSimulation, setPort } = useSoilSense();
  const [ports, setPorts] = useState([]);
  const [selectedPort, setSelectedPort] = useState('AUTO');
  const [calibData, setCalibData] = useState({
    air_raw: 820,
    dry_raw: 750,
    wet_raw: 340,
    soil_type: 'general',
    sensor_id: 'A1'
  });
  const [activeStep, setActiveStep] = useState(1);
  const [loadingPorts, setLoadingPorts] = useState(false);

  const currentRaw = status?.raw_adc;
  const isSimulated = status?.is_simulated;
  const isConnected = status?.arduino_connected;

  const loadPorts = async () => {
    setLoadingPorts(true);
    try {
      const data = await api.getPorts();
      setPorts(data.ports || []);
      if (data.selected_port) {
        setSelectedPort(data.selected_port);
      }
    } catch (err) {
      console.warn('Failed to load serial ports', err);
    } finally {
      setLoadingPorts(false);
    }
  };

  const loadCalibration = async () => {
    try {
      const activeSoil = status?.active_plant?.soil_id || 'general';
      const data = await api.getCalibration('A1', activeSoil);
      if (data) {
        setCalibData({
          air_raw: data.air_raw,
          dry_raw: data.dry_raw,
          wet_raw: data.wet_raw,
          soil_type: data.soil_type,
          sensor_id: data.sensor_id
        });
      }
    } catch (err) {
      console.warn('Calibration load error', err);
    }
  };

  useEffect(() => {
    loadPorts();
    loadCalibration();
  }, [status?.active_plant?.soil_id]);

  const handleCaptureAir = () => {
    if (currentRaw === null || currentRaw === undefined) {
      showToast('No raw sensor signal available to capture.', 'error');
      return;
    }
    setCalibData(prev => ({ ...prev, air_raw: currentRaw }));
    showToast(`Captured Air Reference: ${currentRaw} ADC`, 'success');
    setActiveStep(2);
  };

  const handleCaptureDry = () => {
    if (currentRaw === null || currentRaw === undefined) {
      showToast('No raw sensor signal available to capture.', 'error');
      return;
    }
    setCalibData(prev => ({ ...prev, dry_raw: currentRaw }));
    showToast(`Captured Dry Soil Reference: ${currentRaw} ADC`, 'success');
    setActiveStep(3);
  };

  const handleCaptureWet = () => {
    if (currentRaw === null || currentRaw === undefined) {
      showToast('No raw sensor signal available to capture.', 'error');
      return;
    }
    setCalibData(prev => ({ ...prev, wet_raw: currentRaw }));
    showToast(`Captured Saturated Wet Reference: ${currentRaw} ADC`, 'success');
    setActiveStep(4);
  };

  const handleSaveCalibration = async () => {
    try {
      await api.saveCalibration({
        sensor_id: calibData.sensor_id,
        soil_type: status?.active_plant?.soil_id || 'general',
        air_raw: Number(calibData.air_raw),
        dry_raw: Number(calibData.dry_raw),
        wet_raw: Number(calibData.wet_raw)
      });
      showToast('Calibration saved successfully! Moisture index now recalculating.', 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Sensor Calibration & Hardware Gateway</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Calibrate capacitive probe endpoints (air, dry soil, wet soil) and configure USB Serial interfaces.
        </p>
      </div>

      {/* Hardware Interface & COM Port Selection Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Usb className="w-4 h-4 text-agri-700" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">USB Serial Port Selection</h3>
          </div>
          <button
            onClick={loadPorts}
            className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingPorts ? 'animate-spin' : ''}`} />
            <span>Scan Ports</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Detected COM Ports (Windows Device Manager)
            </label>
            <select
              value={selectedPort}
              onChange={(e) => {
                setSelectedPort(e.target.value);
                setPort(e.target.value);
              }}
              className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-xs font-medium text-zinc-900 focus:outline-none focus:border-agri-600"
            >
              <option value="AUTO">AUTO (Search for Arduino Uno / CH340 / FTDI)</option>
              {ports.map((p) => (
                <option key={p.port} value={p.port}>
                  {p.port} — {p.description || 'Generic Serial'} {p.is_candidate ? '(Arduino Candidate)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              onClick={() => toggleSimulation(!isSimulated)}
              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                isSimulated
                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
              }`}
            >
              {isSimulated ? 'Virtual Demo: ACTIVE' : 'Enable Virtual Mode'}
            </button>
          </div>
        </div>

        <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/80">
          <strong>Port Status:</strong> {isConnected ? `Connected to ${status?.port}` : isSimulated ? 'Simulated Hardware Mode Enabled' : 'Awaiting physical Arduino Uno USB connection'}.
        </div>
      </div>

      {/* Live Sensor Telemetry Meter */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Live Pin A1 Telemetry</span>
          <span className="text-xs font-semibold text-agri-800">
            Current Index: {status?.moisture_index_pct !== null && status?.moisture_index_pct !== undefined ? `${status.moisture_index_pct}%` : '--'}
          </span>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-extrabold text-zinc-900">
            {currentRaw !== null && currentRaw !== undefined ? currentRaw : 'N/A'}
          </span>
          <span className="text-xs text-zinc-500 font-medium">ADC (10-bit raw range: 0 - 1023)</span>
        </div>
      </div>

      {/* Interactive 4-Step Calibration Wizard */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-agri-700" />
            <span>Interactive Multi-Point Soil Calibration Wizard</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            Follow the 4 steps to establish baseline physical voltage endpoints for your specific soil sample and sensor probe.
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-4 gap-2 border-b border-zinc-100 pb-4">
          {[
            { num: 1, title: 'Air Baseline' },
            { num: 2, title: 'Dry Soil' },
            { num: 3, title: 'Saturated Soil' },
            { num: 4, title: 'Review & Save' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setActiveStep(s.num)}
              className={`p-2 rounded-lg text-left transition-all ${
                activeStep === s.num
                  ? 'bg-agri-800 text-white'
                  : 'bg-zinc-50 text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <span className="block text-[10px] uppercase font-bold opacity-80">Step {s.num}</span>
              <span className="text-xs font-semibold truncate block">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Step 1: Air */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-xs text-zinc-700 space-y-2">
              <h4 className="font-bold text-zinc-900 text-sm">Step 1: Free Air Capacitance</h4>
              <p>
                Thoroughly wipe and dry the capacitive probe blades. Hold the sensor in the air away from hands and metals.
                Capacitive sensors output their maximum analog voltage in air (typically 750 to 850 ADC).
              </p>
              <div className="pt-2 flex items-center gap-2 font-bold text-zinc-900">
                <span>Current Live ADC:</span>
                <span className="text-agri-800 text-base">{currentRaw !== null && currentRaw !== undefined ? currentRaw : '--'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Saved Air Raw: <strong>{calibData.air_raw}</strong>
              </div>
              <button
                onClick={handleCaptureAir}
                className="px-4 py-2 bg-agri-800 hover:bg-agri-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span>Capture Air Reading ({currentRaw || calibData.air_raw})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Dry Soil */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-xs text-zinc-700 space-y-2">
              <h4 className="font-bold text-zinc-900 text-sm">Step 2: Oven-Dry / Desiccated Soil Sample</h4>
              <p>
                Insert the probe up to the white indicator line into completely dry soil of your target soil type ({status?.active_soil?.name || 'Sandy Loam'}).
                Firmly press the soil around the blade to ensure good dielectric coupling without air gaps.
              </p>
              <div className="pt-2 flex items-center gap-2 font-bold text-zinc-900">
                <span>Current Live ADC:</span>
                <span className="text-agri-800 text-base">{currentRaw !== null && currentRaw !== undefined ? currentRaw : '--'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Saved Dry Raw: <strong>{calibData.dry_raw}</strong>
              </div>
              <button
                onClick={handleCaptureDry}
                className="px-4 py-2 bg-agri-800 hover:bg-agri-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span>Capture Dry Soil Reading ({currentRaw || calibData.dry_raw})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Wet Soil */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-xs text-zinc-700 space-y-2">
              <h4 className="font-bold text-zinc-900 text-sm">Step 3: Thoroughly Saturated Soil Sample</h4>
              <p>
                Add water until the soil sample reaches 100% field capacity / saturation (pore spaces filled).
                Insert the probe and wait 15 seconds for hydraulic equilibrium. Capacitive ADC values typically drop to 300 - 450 ADC.
              </p>
              <div className="pt-2 flex items-center gap-2 font-bold text-zinc-900">
                <span>Current Live ADC:</span>
                <span className="text-agri-800 text-base">{currentRaw !== null && currentRaw !== undefined ? currentRaw : '--'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Saved Saturated Raw: <strong>{calibData.wet_raw}</strong>
              </div>
              <button
                onClick={handleCaptureWet}
                className="px-4 py-2 bg-agri-800 hover:bg-agri-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <span>Capture Wet Soil Reading ({currentRaw || calibData.wet_raw})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Review and Save */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80 text-xs space-y-3">
              <h4 className="font-bold text-zinc-900 text-sm">Step 4: Calibration Review & Profile Assignment</h4>
              <p className="text-zinc-600">
                Review the calibration curve values below. These will be mapped to the current soil type (
                <strong>{status?.active_soil?.name || 'Sandy Loam'}</strong>).
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-zinc-500 text-[11px] font-semibold mb-1">Air ADC</label>
                  <input
                    type="number"
                    value={calibData.air_raw}
                    onChange={(e) => setCalibData({ ...calibData, air_raw: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[11px] font-semibold mb-1">Dry Soil ADC (0%)</label>
                  <input
                    type="number"
                    value={calibData.dry_raw}
                    onChange={(e) => setCalibData({ ...calibData, dry_raw: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-zinc-900"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 text-[11px] font-semibold mb-1">Wet Soil ADC (100%)</label>
                  <input
                    type="number"
                    value={calibData.wet_raw}
                    onChange={(e) => setCalibData({ ...calibData, wet_raw: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-agri-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={handleSaveCalibration}
                className="px-5 py-2.5 bg-agri-800 hover:bg-agri-900 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Save Calibration Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
