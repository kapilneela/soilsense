const API_BASE = '/api';

export const api = {
  // System Status
  async getStatus() {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Sensor
  async getSensorLatest() {
    const res = await fetch(`${API_BASE}/sensor/latest`);
    if (!res.ok) throw new Error('Failed to fetch sensor reading');
    return res.json();
  },
  async getSensorHistory(hours = 24) {
    const res = await fetch(`${API_BASE}/sensor/history?hours=${hours}`);
    if (!res.ok) throw new Error('Failed to fetch sensor history');
    return res.json();
  },

  // Soils
  async getSoils() {
    const res = await fetch(`${API_BASE}/soils`);
    if (!res.ok) throw new Error('Failed to fetch soil profiles');
    return res.json();
  },
  async getSoil(id) {
    const res = await fetch(`${API_BASE}/soils/${id}`);
    if (!res.ok) throw new Error('Failed to fetch soil details');
    return res.json();
  },

  // Crops
  async getCrops(category = null) {
    const url = category ? `${API_BASE}/crops?category=${encodeURIComponent(category)}` : `${API_BASE}/crops`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch crops');
    return res.json();
  },
  async getCrop(id) {
    const res = await fetch(`${API_BASE}/crops/${id}`);
    if (!res.ok) throw new Error('Failed to fetch crop details');
    return res.json();
  },

  // Plants
  async getPlants() {
    const res = await fetch(`${API_BASE}/plants`);
    if (!res.ok) throw new Error('Failed to fetch plant profiles');
    return res.json();
  },
  async createPlant(data) {
    const res = await fetch(`${API_BASE}/plants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create plant configuration');
    return res.json();
  },
  async updatePlant(id, data) {
    const res = await fetch(`${API_BASE}/plants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update plant configuration');
    return res.json();
  },
  async deletePlant(id) {
    const res = await fetch(`${API_BASE}/plants/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete plant profile');
    return res.json();
  },
  async activatePlant(id) {
    const res = await fetch(`${API_BASE}/plants/${id}/activate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to activate plant profile');
    return res.json();
  },

  // Irrigation
  async getIrrigationStatus() {
    const res = await fetch(`${API_BASE}/irrigation/status`);
    if (!res.ok) throw new Error('Failed to fetch irrigation status');
    return res.json();
  },
  async setIrrigationMode(mode) {
    const res = await fetch(`${API_BASE}/irrigation/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to change irrigation mode');
    }
    return res.json();
  },
  async startIrrigation(duration_sec = 15, reason = 'User manual start') {
    const res = await fetch(`${API_BASE}/irrigation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_sec, reason })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to start pump');
    }
    return res.json();
  },
  async stopIrrigation() {
    const res = await fetch(`${API_BASE}/irrigation/stop`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to stop pump');
    return res.json();
  },
  async emergencyStop() {
    const res = await fetch(`${API_BASE}/irrigation/emergency-stop`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to trigger emergency stop');
    return res.json();
  },
  async resetEmergency() {
    const res = await fetch(`${API_BASE}/irrigation/reset-emergency`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset emergency stop');
    return res.json();
  },
  async getIrrigationHistory(limit = 20) {
    const res = await fetch(`${API_BASE}/irrigation/history?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch irrigation events');
    return res.json();
  },

  // Calibration
  async getCalibration(sensor_id = 'A1', soil_type = 'general') {
    const res = await fetch(`${API_BASE}/calibration?sensor_id=${sensor_id}&soil_type=${soil_type}`);
    if (!res.ok) throw new Error('Failed to fetch calibration');
    return res.json();
  },
  async saveCalibration(data) {
    const res = await fetch(`${API_BASE}/calibration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to save calibration data');
    return res.json();
  },

  // Ports & Simulation
  async getPorts() {
    const res = await fetch(`${API_BASE}/ports`);
    if (!res.ok) throw new Error('Failed to fetch COM ports');
    return res.json();
  },
  async setPort(port) {
    const res = await fetch(`${API_BASE}/ports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ port })
    });
    if (!res.ok) throw new Error('Failed to update serial port');
    return res.json();
  },
  async toggleSimulation(enabled) {
    const res = await fetch(`${API_BASE}/simulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    if (!res.ok) throw new Error('Failed to toggle simulation mode');
    return res.json();
  }
};
