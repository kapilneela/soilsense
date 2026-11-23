import React from 'react';
import { LayoutDashboard, Layers, Sprout, Droplets, LineChart, Sliders } from 'lucide-react';

export const BottomNav = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'soil', label: 'Soil', icon: Layers },
    { id: 'crops', label: 'Crops', icon: Sprout },
    { id: 'irrigation', label: 'Irrigation', icon: Droplets },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'config', label: 'Config', icon: Sliders },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-zinc-200 py-1.5 px-2 shadow-lg">
      <div className="grid grid-cols-6 gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg transition-colors ${
                isActive
                  ? 'text-agri-800 font-semibold bg-agri-50'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] text-agri-700' : 'stroke-[1.75px]'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
