import React, { useState, useEffect } from 'react';
import { 
  Droplets, Play, Square, AlertOctagon, CheckCircle2, ShieldCheck, 
  Clock, History, RotateCcw, AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const IrrigationControlPage = () => {
  const { status, setMode, startPump, stopPump, emergencyStop, resetEmergency, showToast, refreshStatus } = useSoilSense();
  const [history, setHistory] = useState([]);
  const [manualDuration, setManualDuration] = useState(20);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const isPumpOn = status?.pump_state === 'ON';
  const isAuto = status?.mode === 'auto';
  const isEmergency = status?.emergency_stop;
  const isConnected = status?.arduino_connected;
  const isSimulated = status?.is_simulated;

  const loadHistory = async () => {
    try {
      const data = await api.getIrrigationHistory(25);
      setHistory(data);
    } catch (err) {
      console.warn('History fetch error', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Irrigation Actuation & Safety Control</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Manage hardware pump relays, switch automated hysteresis modes, and audit watering logs.
        </p>
      </div>

      {/* Emergency Lockout Banner if Engaged */}
      {isEmergency && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-700">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">EMERGENCY STOP ENGAGED</h3>
              <p className="text-xs text-red-700 mt-0.5">
                The pump relay has been cut off and automated triggers are locked for hardware protection.
              </p>
            </div>
          </div>
          <button
            onClick={resetEmergency}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors shrink-0"
          >
            Reset Emergency Stop
          </button>
        </div>
      )}

      {/* Main Pump Actuation Card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
          {/* Left: Pump Visual State */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isPumpOn 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 ring-4 ring-blue-100 animate-pulse' 
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
            }`}>
              <Droplets className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">DC Pump Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isPumpOn ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {isPumpOn ? 'WATERING IN PROGRESS' : 'STANDBY'}
                </span>
              </div>
              <h2 className="text-3xl font-extrabold text-zinc-900 mt-1">
                {isPumpOn ? `Running: ${status?.pump_runtime_sec || 0}s` : 'Pump Idle'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Pin D7 (isolated relay driver) • Max continuous limit: 45s
              </p>
            </div>
          </div>

          {/* Right: Mode Selector Toggle */}
          <div className="bg-zinc-100 p-1.5 rounded-xl flex items-center gap-1 self-start md:self-center border border-zinc-200">
            <button
              onClick={() => setMode('auto')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isAuto 
                  ? 'bg-white text-agri-900 shadow-sm' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Automatic Mode
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                !isAuto 
                  ? 'bg-white text-agri-900 shadow-sm' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Manual Mode
            </button>
          </div>
        </div>

        {/* Manual Control Action Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Irrigation Duration:</span>
            <div className="flex gap-1.5">
              {[10, 20, 30, 45].map((sec) => (
                <button
                  key={sec}
                  disabled={isPumpOn}
                  onClick={() => setManualDuration(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    manualDuration === sec
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPumpOn ? (
              <button
                onClick={stopPump}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-all"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Pump</span>
              </button>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={isEmergency || (!isConnected && !isSimulated)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-agri-800 hover:bg-agri-900 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold shadow-md transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Manual Irrigation</span>
              </button>
            )}

            <button
              onClick={emergencyStop}
              className="px-3.5 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors"
              title="Immediate emergency shutoff"
            >
              <AlertOctagon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Safety Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Daily Accumulator */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
            <span className="font-semibold text-zinc-700">Daily Water Allowance</span>
            <span>{status?.daily_watering_total_sec || 0}s / 600s</span>
          </div>
          <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden mt-2">
            <div 
              className="bg-agri-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ((status?.daily_watering_total_sec || 0) / 600) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Enforces a hard limit of 10 minutes total pump actuation per 24-hour cycle.
          </p>
        </div>

        {/* Hysteresis Protection */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-agri-700 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Dual-Threshold Hysteresis</span>
          </div>
          <div className="text-xs text-zinc-700 space-y-1 mt-2">
            <p>• <strong>Turn-ON Threshold:</strong> Below {status?.active_plant?.min_moisture_pct || 45}%</p>
            <p>• <strong>Turn-OFF Threshold:</strong> Reaches {status?.active_plant?.target_moisture_pct || 65}%</p>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Eliminates rapid oscillatory motor switching and wear.
          </p>
        </div>

        {/* Failsafe Logic */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Watchdog & Timeouts</span>
          </div>
          <div className="text-xs text-zinc-700 space-y-1 mt-2">
            <p>• Minimum run pulse: <strong>3 seconds</strong></p>
            <p>• Max continuous cycle: <strong>45 seconds</strong></p>
            <p>• Mandatory soak cooldown: <strong>60 seconds</strong></p>
          </div>
        </div>
      </div>

      {/* Historical Irrigation Activity Table */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-agri-700" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">Watering Activity Log</h3>
          </div>
          <button 
            onClick={loadHistory}
            className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {loadingHistory ? (
          <div className="text-center py-6 text-zinc-400 text-xs">Loading activity logs...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-xs">
            No irrigation events recorded yet. Watering events will be logged here with sensor delta timestamps.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-400 uppercase font-semibold text-[10px]">
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Trigger</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Moisture Impact</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Agronomic Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700">
                {history.map((evt) => (
                  <tr key={evt.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-medium whitespace-nowrap text-zinc-900">
                      {new Date(evt.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        evt.trigger_type === 'auto' ? 'bg-agri-100 text-agri-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {evt.trigger_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {evt.duration_sec}s
                    </td>
                    <td className="py-2.5 px-3">
                      {evt.starting_moisture !== null ? `${evt.starting_moisture}%` : '--'} → {evt.ending_moisture !== null ? `${evt.ending_moisture}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        evt.status === 'completed' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 max-w-xs truncate" title={evt.reason}>
                      {evt.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
            <h3 className="text-lg font-bold text-zinc-900 mb-2">Confirm Pump Actuation</h3>
            <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
              Activate DC pump on Pin D7 for <strong>{manualDuration} seconds</strong>?
              Hardware failsafe timer is active. Ensure your water reservoir has adequate supply.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  startPump(manualDuration, 'Manual actuation via web control');
                }}
                className="px-4 py-2 rounded-lg bg-agri-800 text-white text-xs font-semibold hover:bg-agri-900 shadow-sm"
              >
                Proceed & Run Pump
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
