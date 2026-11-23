import React, { useState } from 'react';
import { 
  Play, Square, RefreshCw, Cpu, Layers, Sprout, Droplets, Clock, 
  AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Activity, Thermometer
} from 'lucide-react';
import { useSoilSense } from '../context/SoilSenseContext';
import { MoistureGauge } from '../components/MoistureGauge';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export const DashboardPage = ({ setActiveTab }) => {
  const { status, liveHistory, setMode, startPump, stopPump, toggleSimulation } = useSoilSense();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [manualDuration, setManualDuration] = useState(15);

  const activePlant = status?.active_plant;
  const activeSoil = status?.active_soil;
  const activeCrop = status?.active_crop;
  const isPumpOn = status?.pump_state === 'ON';
  const isAuto = status?.mode === 'auto';
  const isConnected = status?.arduino_connected;
  const isSimulated = status?.is_simulated;

  const minMoisture = activePlant?.min_moisture_pct || 45;
  const targetMoisture = activePlant?.target_moisture_pct || 65;

  return (
    <div className="space-y-5 pb-20 md:pb-6">
      {/* Top Banner: Emergency or Disconnection Alert */}
      {!isConnected && !isSimulated && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-sm">Arduino USB Gateway Disconnected</p>
              <p className="text-xs text-amber-800">
                Plug your Arduino Uno into USB (analog pin A1 for soil sensor, pin D7 for pump driver).
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleSimulation(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-700 text-white hover:bg-amber-800 transition-colors shrink-0"
          >
            Enable Virtual Demo Mode
          </button>
        </div>
      )}

      {/* Main Grid: Live Gauge + Agronomic Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Moisture Gauge Card */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-agri-600 animate-pulse" />
              <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Live Soil Moisture</h2>
            </div>
            <span className="text-[11px] font-medium text-zinc-400">
              {status?.last_sensor_timestamp ? new Date(status.last_sensor_timestamp).toLocaleTimeString() : 'Waiting for sync'}
            </span>
          </div>

          <div className="py-2">
            <MoistureGauge
              moisturePct={status?.moisture_index_pct}
              rawAdc={status?.raw_adc}
              status={status?.moisture_status}
              minThreshold={minMoisture}
              targetThreshold={targetMoisture}
              isDisconnected={!isConnected && !isSimulated}
            />
          </div>

          {/* Mini Live Sparkline */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
              <span>60s Live Dynamics</span>
              <span>{liveHistory.length > 0 ? `${liveHistory[liveHistory.length - 1].moisture}%` : '--'}</span>
            </div>
            <div className="h-10 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={liveHistory}>
                  <YAxis domain={[0, 100]} hide />
                  <Line type="monotone" dataKey="moisture" stroke="#2c5b3e" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Agronomic Recommendation & Active System Status */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Decision Engine Recommendation Card */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-agri-700" />
                <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Irrigation Intelligence</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Mode:</span>
                <button
                  onClick={() => setMode(isAuto ? 'manual' : 'auto')}
                  className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                    isAuto 
                      ? 'bg-agri-700 text-white' 
                      : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                  }`}
                >
                  {isAuto ? 'AUTOMATIC' : 'MANUAL'}
                </button>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3.5 mb-4">
              <p className="text-sm font-medium text-zinc-800 leading-relaxed">
                {status?.irrigation_recommendation || 'Analyzing soil telemetry...'}
              </p>
            </div>

            {/* Quick Pump Control Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {isPumpOn ? (
                <button
                  onClick={stopPump}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Water Pump ({status?.pump_runtime_sec || 0}s running)</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-agri-800 hover:bg-agri-900 text-white font-semibold text-sm shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Manual Irrigate ({manualDuration}s)</span>
                </button>
              )}

              <select
                value={manualDuration}
                onChange={(e) => setManualDuration(Number(e.target.value))}
                className="bg-zinc-100 border border-zinc-300 text-zinc-800 text-xs rounded-lg px-3 py-2.5 font-medium outline-none"
              >
                <option value={10}>10 Seconds</option>
                <option value={15}>15 Seconds</option>
                <option value={20}>20 Seconds</option>
                <option value={30}>30 Seconds</option>
                <option value={45}>45 Seconds</option>
              </select>
            </div>
          </div>

          {/* Active Crop & Soil Quick Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Active Soil Card */}
            <div 
              onClick={() => setActiveTab('soil')}
              className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-agri-500 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Selected Soil</span>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-agri-600 transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm">{activeSoil?.name || 'Sandy Loam'}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-1">{activeSoil?.drainage_characteristics || 'Good drainage'}</p>
                </div>
              </div>
            </div>

            {/* Active Crop Card */}
            <div 
              onClick={() => setActiveTab('crops')}
              className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm hover:border-agri-500 cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Cultivated Crop</span>
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-agri-600 transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-agri-50 border border-agri-200 flex items-center justify-center text-agri-800">
                  <Sprout className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900 text-sm">{activeCrop?.name || 'Tomato'}</h4>
                  <p className="text-xs text-zinc-500">Stage: <span className="font-semibold text-agri-800">{activePlant?.growth_stage || 'Flowering'}</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Pump Status */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Water Pump</span>
            <Droplets className={`w-4 h-4 ${isPumpOn ? 'text-blue-500 animate-bounce' : 'text-zinc-400'}`} />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {isPumpOn ? 'ACTIVE' : 'OFF'}
          </div>
          <span className="text-[11px] text-zinc-400">
            {isPumpOn ? `Active: ${status?.pump_runtime_sec}s` : 'Standby mode'}
          </span>
        </div>

        {/* Metric 2: Today's Watering Total */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Daily Irrigation</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {status?.daily_watering_total_sec || 0}s
          </div>
          <span className="text-[11px] text-zinc-400">
            Max limit: 600s/24h
          </span>
        </div>

        {/* Metric 3: Target Moisture Range */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Target Threshold</span>
            <ShieldCheck className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900">
            {minMoisture}% - {targetMoisture}%
          </div>
          <span className="text-[11px] text-zinc-400">
            {activePlant?.cultivation_type || 'Open-field'}
          </span>
        </div>

        {/* Metric 4: Ambient / Hardware Status */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs mb-1">
            <span>Interface Link</span>
            <Cpu className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900 truncate">
            {isSimulated ? 'Simulated' : (isConnected ? 'USB Live' : 'Offline')}
          </div>
          <span className="text-[11px] text-zinc-400 truncate block">
            {isConnected ? status?.port : 'Awaiting COM'}
          </span>
        </div>
      </div>

      {/* Confirmation Modal for Manual Irrigation */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Confirm Manual Watering</h3>
            <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
              You are requesting to run the water pump for <strong className="text-zinc-900">{manualDuration} seconds</strong> for <strong className="text-agri-800">{activeCrop?.name || 'your crop'}</strong>.
              The system will enforce safety timeouts and dry-run boundaries.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  startPump(manualDuration, 'Manual trigger confirmed by user');
                }}
                className="px-4 py-2 rounded-lg bg-agri-800 text-white text-sm font-semibold hover:bg-agri-900 transition-colors shadow-sm"
              >
                Confirm & Start Pump
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
