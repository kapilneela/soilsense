import React, { useState, useEffect } from 'react';
import { Layers, Droplet, Wind, Sprout, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const SoilAnalysisPage = ({ setActiveTab }) => {
  const { status, showToast, refreshStatus } = useSoilSense();
  const [soils, setSoils] = useState([]);
  const [selectedSoilId, setSelectedSoilId] = useState(status?.active_plant?.soil_id || 'sandy_loam');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSoils = async () => {
      try {
        const data = await api.getSoils();
        setSoils(data);
        if (status?.active_plant?.soil_id) {
          setSelectedSoilId(status.active_plant.soil_id);
        }
      } catch (err) {
        showToast('Failed to load soil profiles', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadSoils();
  }, [status?.active_plant?.soil_id]);

  const activeSoilProfile = soils.find(s => s.id === selectedSoilId) || soils[0];

  const handleApplyToActivePlant = async () => {
    if (!status?.active_plant) {
      showToast('No active plant profile to update.', 'error');
      return;
    }
    try {
      const updated = {
        ...status.active_plant,
        soil_id: selectedSoilId
      };
      await api.updatePlant(status.active_plant.id, updated);
      showToast(`Updated active plot soil to ${activeSoilProfile.name}. Physical sensor readings remain unmanipulated.`, 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 text-sm">Loading soil agronomic database...</div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Soil Intelligence & Hydraulic Profiles</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Explore soil physical mechanics, infiltration dynamics, and agronomic considerations.
        </p>
      </div>

      {/* Horizontal Soil Types Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {soils.map((s) => {
          const isSelected = s.id === selectedSoilId;
          const isCurrentActive = status?.active_plant?.soil_id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedSoilId(s.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-agri-800 text-white border-agri-900 shadow-sm'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              <span>{s.name}</span>
              {isCurrentActive && (
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-agri-300' : 'bg-agri-600'}`}></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Profile Showcase */}
      {activeSoilProfile && (
        <div className="space-y-5">
          {/* Header Card with Apply Button */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase font-bold text-agri-700 tracking-wider">Classification</span>
                {status?.active_plant?.soil_id === activeSoilProfile.id && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-agri-100 text-agri-800">
                    CURRENTLY ACTIVE
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900">{activeSoilProfile.name}</h2>
              <p className="text-sm text-zinc-600 mt-1 max-w-3xl leading-relaxed">
                {activeSoilProfile.description}
              </p>
            </div>

            {status?.active_plant?.soil_id !== activeSoilProfile.id && (
              <button
                onClick={handleApplyToActivePlant}
                className="self-start md:self-center flex items-center gap-2 px-4 py-2.5 rounded-lg bg-agri-800 hover:bg-agri-900 text-white text-xs font-semibold transition-all shadow-sm shrink-0"
              >
                <span>Set as Active Plot Soil</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Key Hydrologic Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-agri-700 font-bold text-xs uppercase tracking-wider mb-2">
                <Droplet className="w-4 h-4" />
                <span>Water Retention</span>
              </div>
              <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                {activeSoilProfile.water_retention_capacity}
              </p>
              <div className="mt-3 pt-3 border-t border-zinc-100 grid grid-cols-2 text-xs">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Field Capacity</span>
                  <span className="font-bold text-zinc-700">{activeSoilProfile.field_capacity_pct}%</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[11px]">Wilting Point</span>
                  <span className="font-bold text-zinc-700">{activeSoilProfile.wilting_point_pct}%</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                <Wind className="w-4 h-4" />
                <span>Drainage & Aeration</span>
              </div>
              <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                {activeSoilProfile.drainage_characteristics}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                <strong>Aeration:</strong> {activeSoilProfile.aeration_characteristics}
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider mb-2">
                <Layers className="w-4 h-4" />
                <span>Particle Texture & Tilth</span>
              </div>
              <p className="text-sm text-zinc-800 font-medium leading-relaxed">
                {activeSoilProfile.particle_characteristics}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                <strong>Organic Matter:</strong> {activeSoilProfile.organic_matter}
              </p>
            </div>
          </div>

          {/* Irrigation Engine Guidance Banner */}
          <div className="bg-agri-50 border border-agri-200/80 rounded-xl p-5">
            <div className="flex items-center gap-2 text-agri-900 font-bold text-sm mb-2">
              <ShieldCheck className="w-4 h-4 text-agri-700" />
              <span>Irrigation Strategy for {activeSoilProfile.name}</span>
            </div>
            <p className="text-sm text-agri-900/90 leading-relaxed font-medium">
              {activeSoilProfile.irrigation_considerations}
            </p>
          </div>

          {/* Advantages & Limitations Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Advantages */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2 text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Agronomic Advantages</span>
              </h3>
              <ul className="space-y-2">
                {activeSoilProfile.advantages.map((adv, idx) => (
                  <li key={idx} className="text-xs text-zinc-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Limitations */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2 text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span>Agronomic Limitations</span>
              </h3>
              <ul className="space-y-2">
                {activeSoilProfile.limitations.map((lim, idx) => (
                  <li key={idx} className="text-xs text-zinc-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0"></span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suitable Crops Section */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider mb-3 flex items-center gap-2 text-agri-800">
              <Sprout className="w-4 h-4 text-agri-600" />
              <span>Recommended Crops for this Soil</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {activeSoilProfile.suitable_crops.map((cropName, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-agri-50 hover:text-agri-900 text-zinc-800 text-xs font-semibold border border-zinc-200/80 transition-colors"
                >
                  {cropName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
