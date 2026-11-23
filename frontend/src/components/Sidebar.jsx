import React from 'react';
import { LayoutDashboard, Layers, Sprout, Droplets, LineChart, Sliders, Wrench, Shield, Info } from 'lucide-react';
import { useSoilSense } from '../context/SoilSenseContext';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { status } = useSoilSense();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'soil', label: 'Soil Analysis', icon: Layers },
    { id: 'crops', label: 'Crop Intelligence', icon: Sprout },
    { id: 'irrigation', label: 'Irrigation Control', icon: Droplets },
    { id: 'analytics', label: 'Moisture Analytics', icon: LineChart },
    { id: 'config', label: 'Plant Configuration', icon: Sliders },
    { id: 'calibration', label: 'Sensor Calibration', icon: Wrench },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 min-h-[calc(100vh-61px)] p-4 shrink-0">
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                isActive
                  ? 'bg-agri-800 text-white shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-agri-300' : 'text-zinc-500'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mini Active Status Panel */}
      <div className="mt-auto pt-6 border-t border-zinc-200">
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500">
            <span>Hardware Status</span>
            <span className={`font-semibold ${status?.arduino_connected ? 'text-emerald-700' : 'text-red-600'}`}>
              {status?.arduino_connected ? 'Online' : status?.is_simulated ? 'Simulated' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500">
            <span>Water Pump</span>
            <span className={`font-semibold ${status?.pump_state === 'ON' ? 'text-blue-600 animate-pulse' : 'text-zinc-700'}`}>
              {status?.pump_state || 'OFF'}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500">
            <span>Active Soil</span>
            <span className="font-semibold text-zinc-800 truncate max-w-[100px]">
              {status?.active_soil?.name || 'Sandy Loam'}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-500">
            <span>Crop & Stage</span>
            <span className="font-semibold text-zinc-800 truncate max-w-[100px]">
              {status?.active_crop?.name || 'Tomato'}
            </span>
          </div>
        </div>

        <div className="mt-3 text-[11px] text-zinc-400 text-center">
          SoilSense Gateway v1.0.0
        </div>
      </div>
    </aside>
  );
};
