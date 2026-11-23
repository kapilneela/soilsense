import React, { useState, useEffect } from 'react';
import { 
  Sprout, Search, Droplets, Thermometer, ArrowRight, X, AlertTriangle, 
  ShieldCheck, Layers, Calendar, CheckCircle2 
} from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const CropIntelligencePage = () => {
  const { status, showToast, refreshStatus } = useSoilSense();
  const [crops, setCrops] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCrop, setSelectedCrop] = useState(null);
  const [selectedStageName, setSelectedStageName] = useState('Vegetative');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Cereals', 'Vegetables', 'Fruits', 'Commercial crops'];

  useEffect(() => {
    const loadCrops = async () => {
      try {
        const data = await api.getCrops();
        setCrops(data);
        if (data.length > 0 && !selectedCrop) {
          // Default selection to current active crop if present
          const activeId = status?.active_plant?.crop_id;
          const match = data.find(c => c.id === activeId) || data[0];
          setSelectedCrop(match);
          setSelectedStageName(status?.active_plant?.growth_stage || 'Vegetative');
        }
      } catch (err) {
        showToast('Failed to load crop database', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadCrops();
  }, [status?.active_plant?.crop_id]);

  const filteredCrops = crops.filter(c => {
    const matchesCategory = selectedCategory === 'All' || c.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.scientific_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApplyCrop = async (crop, stageName) => {
    if (!status?.active_plant) {
      showToast('No active plant profile found to update.', 'error');
      return;
    }
    try {
      const activeStage = crop.growth_stages.find(s => s.stage_name === stageName) || crop.growth_stages[0];
      const updated = {
        ...status.active_plant,
        crop_id: crop.id,
        growth_stage: stageName,
        target_moisture_pct: activeStage.moisture_target_pct,
        min_moisture_pct: activeStage.moisture_min_pct,
        max_moisture_pct: activeStage.moisture_max_pct
      };
      await api.updatePlant(status.active_plant.id, updated);
      showToast(`Updated active plot to ${crop.name} (${stageName} stage). Targets adjusted automatically.`, 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500 text-sm">Loading verified crop agronomy database...</div>;
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Crop Intelligence & Phenology</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Search scientifically verified crop profiles, stage-dependent moisture factors, and water stress thresholds.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Search crops or scientific names..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-agri-600"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-agri-800 text-white'
                  : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Crop Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCrops.map((crop) => {
          const isSelected = selectedCrop?.id === crop.id;
          const isCurrentlyActive = status?.active_plant?.crop_id === crop.id;

          return (
            <div
              key={crop.id}
              onClick={() => {
                setSelectedCrop(crop);
                setSelectedStageName(status?.active_plant?.crop_id === crop.id ? (status?.active_plant?.growth_stage || 'Vegetative') : 'Vegetative');
              }}
              className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition-all hover:border-agri-500 flex flex-col justify-between ${
                isSelected ? 'border-agri-600 ring-2 ring-agri-600/20' : 'border-zinc-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-agri-700 bg-agri-50 px-2 py-0.5 rounded">
                    {crop.category}
                  </span>
                  {isCurrentlyActive && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-zinc-900 text-base">{crop.name}</h3>
                <p className="text-xs italic text-zinc-400 mb-2">{crop.scientific_name}</p>
                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed mb-3">
                  {crop.description}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-blue-500" />
                  {crop.water_requirement_mm.split(' ')[0]} mm
                </span>
                <span className="flex items-center gap-1 text-zinc-600 font-semibold">
                  View Profile <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep Crop Inspection Modal / Panel */}
      {selectedCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-zinc-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-agri-100 text-agri-800">
                    {selectedCrop.category}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">{selectedCrop.growth_duration_days}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-zinc-900">{selectedCrop.name}</h2>
                <p className="text-sm italic text-zinc-500">{selectedCrop.scientific_name}</p>
              </div>
              <button
                onClick={() => setSelectedCrop(null)}
                className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-zinc-700 leading-relaxed">
              {selectedCrop.description}
            </p>

            {/* Agronomic Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px]">Water Need</span>
                <span className="font-bold text-zinc-800">{selectedCrop.water_requirement_mm}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Ideal pH Range</span>
                <span className="font-bold text-zinc-800">{selectedCrop.preferred_ph_range}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">Temperature</span>
                <span className="font-bold text-zinc-800">{selectedCrop.temperature_range}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px]">NPK Ratio</span>
                <span className="font-bold text-zinc-800">{selectedCrop.npk_ratio}</span>
              </div>
            </div>

            {/* Growth Stages Selector & Stage Intelligence */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-agri-600" />
                  <span>Growth Stages & Water Sensitivity</span>
                </h4>
                <span className="text-[11px] text-zinc-400">Select stage to inspect</span>
              </div>

              {/* Stage Buttons */}
              <div className="grid grid-cols-5 gap-1.5 mb-3">
                {selectedCrop.growth_stages.map((stage) => {
                  const isStageSelected = selectedStageName === stage.stage_name;
                  return (
                    <button
                      key={stage.stage_name}
                      onClick={() => setSelectedStageName(stage.stage_name)}
                      className={`py-2 px-1 rounded-lg text-xs font-bold text-center transition-all ${
                        isStageSelected
                          ? 'bg-agri-800 text-white shadow-sm'
                          : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                      }`}
                    >
                      {stage.stage_name}
                    </button>
                  );
                })}
              </div>

              {/* Active Stage Detail Box */}
              {(() => {
                const activeStageObj = selectedCrop.growth_stages.find(s => s.stage_name === selectedStageName) || selectedCrop.growth_stages[0];
                return (
                  <div className="bg-agri-50 border border-agri-200/80 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-agri-900 text-sm">{activeStageObj.stage_name} Phase</span>
                      <span className="font-bold px-2 py-0.5 rounded bg-white text-agri-800 border border-agri-200">
                        Target Moisture: {activeStageObj.moisture_target_pct}% ({activeStageObj.moisture_min_pct}% - {activeStageObj.moisture_max_pct}%)
                      </span>
                    </div>
                    <p className="text-agri-950 font-medium leading-relaxed">{activeStageObj.description}</p>
                    <div className="pt-2 border-t border-agri-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-700">
                      <div>
                        <strong className="text-agri-900 block mb-0.5">Irrigation Advice:</strong>
                        <span>{activeStageObj.irrigation_frequency_advice}</span>
                      </div>
                      <div>
                        <strong className="text-agri-900 block mb-0.5">Water Stress Vulnerability:</strong>
                        <span>{activeStageObj.water_stress_impact}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Overwatering & Underwatering Warnings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 text-xs">
                <span className="font-bold text-red-900 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Overwatering Risks
                </span>
                <ul className="space-y-1 text-red-950">
                  {selectedCrop.overwatering_risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-red-500 mt-1.5 shrink-0"></span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Underwatering Risks
                </span>
                <ul className="space-y-1 text-amber-950">
                  {selectedCrop.underwatering_risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setSelectedCrop(null)}
                className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleApplyCrop(selectedCrop, selectedStageName);
                  setSelectedCrop(null);
                }}
                className="px-4 py-2 rounded-lg bg-agri-800 text-white text-xs font-semibold hover:bg-agri-900 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <span>Apply {selectedCrop.name} ({selectedStageName}) to Active Plot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
