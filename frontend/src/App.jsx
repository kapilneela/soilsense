import React, { useState } from 'react';
import { SoilSenseProvider, useSoilSense } from './context/SoilSenseContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardPage } from './pages/DashboardPage';
import { SoilAnalysisPage } from './pages/SoilAnalysisPage';
import { CropIntelligencePage } from './pages/CropIntelligencePage';
import { IrrigationControlPage } from './pages/IrrigationControlPage';
import { MoistureAnalyticsPage } from './pages/MoistureAnalyticsPage';
import { PlantConfigPage } from './pages/PlantConfigPage';
import { CalibrationPage } from './pages/CalibrationPage';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const ToastNotification = () => {
  const { toast } = useSoilSense();
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm animate-fade-in shadow-xl">
      <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs font-semibold ${
        isSuccess 
          ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
          : isError 
          ? 'bg-red-50 text-red-900 border-red-200' 
          : 'bg-zinc-800 text-white border-zinc-700'
      }`}>
        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
        {isError && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
        {!isSuccess && !isError && <Info className="w-4 h-4 text-zinc-300 shrink-0 mt-0.5" />}
        <span className="leading-snug">{toast.message}</span>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <ToastNotification />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardPage setActiveTab={setActiveTab} />}
          {activeTab === 'soil' && <SoilAnalysisPage setActiveTab={setActiveTab} />}
          {activeTab === 'crops' && <CropIntelligencePage />}
          {activeTab === 'irrigation' && <IrrigationControlPage />}
          {activeTab === 'analytics' && <MoistureAnalyticsPage />}
          {activeTab === 'config' && <PlantConfigPage />}
          {activeTab === 'calibration' && <CalibrationPage />}
        </main>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default function App() {
  return (
    <SoilSenseProvider>
      <MainLayout />
    </SoilSenseProvider>
  );
}
