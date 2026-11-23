import React, { useState, useEffect } from 'react';
import { 
  Sliders, Plus, CheckCircle2, Trash2, Edit2, Sprout, Layers, 
  Calendar, Droplets, ShieldCheck, Sun, Thermometer 
} from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const PlantConfigPage = () => {
  const { status, showToast, refreshStatus } = useSoilSense();
  const [plants, setPlants] = useState([]);
  const [soils, setSoils] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState(null);

  const [formData, setFormData] = useState({
    name: 'Plot 1 - Solanaceous Bed',
    soil_id: 'sandy_loam',
    crop_id: 'tomato',
    variety: 'Standard Field',
    growth_stage: 'Vegetative',
    planting_date: new Date().toISOString().split('T')[0],
    expected_harvest_date: '',
    plant_count: 24,
    cultivation_area_sqm: 12.0,
    cultivation_type: 'open-field',
    irrigation_method: 'Drip',
    target_moisture_pct: 65,
    min_moisture_pct: 45,
    max_moisture_pct: 85,
    max_irrigation_duration_sec: 30,
    air_temp: 26.0,
    air_humidity: 60.0,
    rainfall: 0.0,
    sunlight_exposure: 'Full sun',
    soil_ph: 6.5,
    soil_temp: 22.0,
    is_active: true
  });

  const loadData = async () => {
    try {
      const [plantsData, soilsData, cropsData] = await Promise.all([
        api.getPlants(),
        api.getSoils(),
        api.getCrops()
      ]);
      setPlants(plantsData);
      setSoils(soilsData);
      setCrops(cropsData);
    } catch (err) {
      showToast('Failed to load plant configuration data', 'error');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setEditingPlantId(null);
    setFormData({
      name: 'Plot - New Sector',
      soil_id: 'sandy_loam',
      crop_id: 'tomato',
      variety: 'Commercial Cultivar',
      growth_stage: 'Vegetative',
      planting_date: new Date().toISOString().split('T')[0],
      expected_harvest_date: '',
      plant_count: 20,
      cultivation_area_sqm: 10.0,
      cultivation_type: 'open-field',
      irrigation_method: 'Drip',
      target_moisture_pct: 65,
      min_moisture_pct: 45,
      max_moisture_pct: 85,
      max_irrigation_duration_sec: 30,
      air_temp: 25.0,
      air_humidity: 55.0,
      rainfall: 0.0,
      sunlight_exposure: 'Full sun',
      soil_ph: 6.5,
      soil_temp: 21.0,
      is_active: true
    });
    setShowModal(true);
  };

  const handleOpenEdit = (plant) => {
    setEditingPlantId(plant.id);
    setFormData({
      ...plant,
      is_active: Boolean(plant.is_active)
    });
    setShowModal(true);
  };

  const handleCropChange = (cropId) => {
    const crop = crops.find(c => c.id === cropId);
    let targetM = formData.target_moisture_pct;
    let minM = formData.min_moisture_pct;
    let maxM = formData.max_moisture_pct;

    if (crop && crop.growth_stages) {
      const stage = crop.growth_stages.find(s => s.stage_name === formData.growth_stage) || crop.growth_stages[0];
      targetM = stage.moisture_target_pct;
      minM = stage.moisture_min_pct;
      maxM = stage.moisture_max_pct;
    }

    setFormData(prev => ({
      ...prev,
      crop_id: cropId,
      target_moisture_pct: targetM,
      min_moisture_pct: minM,
      max_moisture_pct: maxM
    }));
  };

  const handleStageChange = (stageName) => {
    const crop = crops.find(c => c.id === formData.crop_id);
    let targetM = formData.target_moisture_pct;
    let minM = formData.min_moisture_pct;
    let maxM = formData.max_moisture_pct;

    if (crop && crop.growth_stages) {
      const stage = crop.growth_stages.find(s => s.stage_name === stageName);
      if (stage) {
        targetM = stage.moisture_target_pct;
        minM = stage.moisture_min_pct;
        maxM = stage.moisture_max_pct;
      }
    }

    setFormData(prev => ({
      ...prev,
      growth_stage: stageName,
      target_moisture_pct: targetM,
      min_moisture_pct: minM,
      max_moisture_pct: maxM
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlantId) {
        await api.updatePlant(editingPlantId, formData);
        showToast('Plant profile updated successfully.', 'success');
      } else {
        await api.createPlant(formData);
        showToast('New plant profile registered.', 'success');
      }
      setShowModal(false);
      loadData();
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleActivate = async (id) => {
    try {
      await api.activatePlant(id);
      showToast('Activated plant profile.', 'success');
      loadData();
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this plant profile?')) return;
    try {
      await api.deletePlant(id);
      showToast('Plant profile removed.', 'info');
      loadData();
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Plant & Agronomic Configuration</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Configure crop variety, growth stages, soil hydraulics, and irrigation thresholds.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-agri-800 text-white text-xs font-semibold hover:bg-agri-900 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Plant Profile</span>
        </button>
      </div>

      {/* List of Configured Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plants.map((plant) => {
          const isActive = Boolean(plant.is_active);
          const soil = soils.find(s => s.id === plant.soil_id);
          const crop = crops.find(c => c.id === plant.crop_id);

          return (
            <div
              key={plant.id}
              className={`bg-white border rounded-xl p-5 shadow-sm space-y-4 transition-all ${
                isActive ? 'border-agri-600 ring-2 ring-agri-600/20' : 'border-zinc-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-zinc-900 text-base">{plant.name}</h3>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 font-medium">
                    {crop?.name || plant.crop_id} ({plant.variety}) • {plant.growth_stage} Stage
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(plant)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                    title="Edit profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {plants.length > 1 && (
                    <button
                      onClick={() => handleDelete(plant.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Badges / Key Specs */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-3 rounded-lg border border-zinc-200/80">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Soil Substrate</span>
                  <span className="font-semibold text-zinc-800">{soil?.name || plant.soil_id}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Target Moisture</span>
                  <span className="font-semibold text-agri-800">{plant.target_moisture_pct}% (Min {plant.min_moisture_pct}%)</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Irrigation Method</span>
                  <span className="font-semibold text-zinc-800">{plant.irrigation_method} ({plant.max_irrigation_duration_sec}s cycle)</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase font-bold">Cultivation</span>
                  <span className="font-semibold text-zinc-800">{plant.cultivation_type} • {plant.plant_count} plants</span>
                </div>
              </div>

              {!isActive && (
                <button
                  onClick={() => handleActivate(plant.id)}
                  className="w-full py-2 rounded-lg bg-zinc-100 hover:bg-agri-800 hover:text-white text-zinc-700 text-xs font-semibold transition-all text-center"
                >
                  Activate this Profile
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Profile Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-zinc-200">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">
              {editingPlantId ? 'Edit Plant Profile' : 'Create New Plant Profile'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Profile Name */}
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Profile Name / Plot Designation</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:border-agri-600"
                />
              </div>

              {/* Crop & Variety Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Cultivated Crop</label>
                  <select
                    value={formData.crop_id}
                    onChange={(e) => handleCropChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:border-agri-600"
                  >
                    {crops.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Variety / Hybrid (Optional)</label>
                  <input
                    type="text"
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:border-agri-600"
                  />
                </div>
              </div>

              {/* Soil & Growth Stage Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Soil Type</label>
                  <select
                    value={formData.soil_id}
                    onChange={(e) => setFormData({ ...formData, soil_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:border-agri-600"
                  >
                    {soils.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Current Growth Stage</label>
                  <select
                    value={formData.growth_stage}
                    onChange={(e) => handleStageChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 font-medium focus:outline-none focus:border-agri-600"
                  >
                    <option value="Seedling">Seedling</option>
                    <option value="Vegetative">Vegetative</option>
                    <option value="Flowering">Flowering</option>
                    <option value="Fruiting">Fruiting</option>
                    <option value="Maturity">Maturity</option>
                  </select>
                </div>
              </div>

              {/* Moisture Thresholds */}
              <div className="p-3.5 bg-agri-50/60 rounded-xl border border-agri-200/80 space-y-3">
                <span className="font-bold text-agri-900 block text-xs">
                  Stage-Specific Moisture Target & Safety Hysteresis (%)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-600 text-[11px] font-medium mb-1">Min Threshold</label>
                    <input
                      type="number"
                      min="10"
                      max="80"
                      value={formData.min_moisture_pct}
                      onChange={(e) => setFormData({ ...formData, min_moisture_pct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 text-[11px] font-medium mb-1">Target Moisture</label>
                    <input
                      type="number"
                      min="20"
                      max="95"
                      value={formData.target_moisture_pct}
                      onChange={(e) => setFormData({ ...formData, target_moisture_pct: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-agri-800"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-600 text-[11px] font-medium mb-1">Cycle Duration (s)</label>
                    <input
                      type="number"
                      min="5"
                      max="45"
                      value={formData.max_irrigation_duration_sec}
                      onChange={(e) => setFormData({ ...formData, max_irrigation_duration_sec: Number(e.target.value) })}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg font-bold text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Cultivation Setup */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Type</label>
                  <select
                    value={formData.cultivation_type}
                    onChange={(e) => setFormData({ ...formData, cultivation_type: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg"
                  >
                    <option value="open-field">Open-Field</option>
                    <option value="container">Container/Pot</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Area (m²)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.cultivation_area_sqm}
                    onChange={(e) => setFormData({ ...formData, cultivation_area_sqm: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Plant Count</label>
                  <input
                    type="number"
                    value={formData.plant_count}
                    onChange={(e) => setFormData({ ...formData, plant_count: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Method</label>
                  <select
                    value={formData.irrigation_method}
                    onChange={(e) => setFormData({ ...formData, irrigation_method: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-zinc-300 rounded-lg"
                  >
                    <option value="Drip">Drip</option>
                    <option value="Micro-sprinkler">Micro-sprinkler</option>
                    <option value="Furrow">Furrow</option>
                    <option value="Subsurface">Subsurface Drip</option>
                  </select>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-zinc-700 font-semibold hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-agri-800 text-white font-semibold hover:bg-agri-900 shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
