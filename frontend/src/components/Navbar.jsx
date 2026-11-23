import React from 'react';
import { Sprout, Usb, AlertOctagon, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';
import { useSoilSense } from '../context/SoilSenseContext';

export const Navbar = ({ activeTab, setActiveTab }) => {
  const { status, emergencyStop, resetEmergency } = useSoilSense();

  const isConnected = status?.arduino_connected;
  const isSimulated = status?.is_simulated;
  const port = status?.port || 'N/A';
  const isEmergency = status?.emergency_stop;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-zinc-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-9 h-9 rounded-lg bg-agri-800 flex items-center justify-center text-white shadow-sm">
            <Sprout className="w-5 h-5 text-agri-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-zinc-900 leading-none">SoilSense</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-agri-100 text-agri-800 tracking-wider">PRO</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium">Smart Soil & Irrigation Gateway</p>
          </div>
        </div>

        {/* Right side status indicators */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Connection Status Badge */}
          <div className="flex items-center">
            {isSimulated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200">
                <Cpu className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                <span className="hidden sm:inline">Virtual Demo Mode</span>
                <span className="sm:hidden">Demo</span>
              </span>
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-900 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <Usb className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Uno ({port})</span>
                <span className="sm:hidden">{port}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-900 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <Usb className="w-3.5 h-3.5 text-red-600" />
                <span className="hidden sm:inline">Hardware Disconnected</span>
                <span className="sm:hidden">Offline</span>
              </span>
            )}
          </div>

          {/* Mode Badge */}
          <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
            status?.mode === 'auto' ? 'bg-agri-100 text-agri-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {status?.mode || 'AUTO'}
          </span>

          {/* Emergency Stop / Unlock Button */}
          {isEmergency ? (
            <button
              onClick={resetEmergency}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Reset E-Stop</span>
            </button>
          ) : (
            <button
              onClick={emergencyStop}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-colors"
              title="Immediately stops pump and locks system"
            >
              <AlertOctagon className="w-4 h-4" />
              <span className="hidden sm:inline">E-Stop</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
