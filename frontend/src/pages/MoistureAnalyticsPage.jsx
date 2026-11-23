import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { Activity, Clock, TrendingUp, Droplets, Calendar, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { useSoilSense } from '../context/SoilSenseContext';

export const MoistureAnalyticsPage = () => {
  const { status, liveHistory } = useSoilSense();
  const [historyData, setHistoryData] = useState([]);
  const [selectedRange, setSelectedRange] = useState(24);
  const [chartMode, setChartMode] = useState('moisture'); // 'moisture' or 'raw'
  const [loading, setLoading] = useState(false);

  const minMoisture = status?.active_plant?.min_moisture_pct || 45;
  const targetMoisture = status?.active_plant?.target_moisture_pct || 65;

  const loadHistory = async (hours) => {
    setLoading(true);
    try {
      const data = await api.getSensorHistory(hours);
      // Format timestamps for chart readability
      const formatted = data.map((item) => {
        const d = new Date(item.timestamp);
        return {
          time: hours <= 24 
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          moisture: item.moisture_index_pct,
          raw: item.raw_adc
        };
      });
      setHistoryData(formatted);
    } catch (err) {
      console.warn('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(selectedRange);
  }, [selectedRange]);

  // Compute analytics metrics
  const validPoints = historyData.filter(d => d.moisture !== null);
  const avgMoisture = validPoints.length > 0
    ? (validPoints.reduce((acc, d) => acc + d.moisture, 0) / validPoints.length).toFixed(1)
    : '--';
  const minRecorded = validPoints.length > 0
    ? Math.min(...validPoints.map(d => d.moisture)).toFixed(1)
    : '--';
  const maxRecorded = validPoints.length > 0
    ? Math.max(...validPoints.map(d => d.moisture)).toFixed(1)
    : '--';

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Moisture Analytics & Soil Telemetry</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Audit long-term hydrologic equilibrium, sensor raw fluctuations, and watering responses.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          {[
            { label: 'Live (60s)', hours: 0 },
            { label: '6 Hours', hours: 6 },
            { label: '24 Hours', hours: 24 },
            { label: '7 Days', hours: 168 },
          ].map((r) => (
            <button
              key={r.hours}
              onClick={() => setSelectedRange(r.hours)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRange === r.hours
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Current Index</span>
          <div className="text-2xl font-extrabold text-agri-800">
            {status?.moisture_index_pct !== null && status?.moisture_index_pct !== undefined ? `${status.moisture_index_pct}%` : '--'}
          </div>
          <span className="text-xs text-zinc-500">Live probe reading</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Average Moisture</span>
          <div className="text-2xl font-extrabold text-zinc-900">
            {avgMoisture !== '--' ? `${avgMoisture}%` : '--'}
          </div>
          <span className="text-xs text-zinc-500">Period average</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Minimum Reached</span>
          <div className="text-2xl font-extrabold text-amber-600">
            {minRecorded !== '--' ? `${minRecorded}%` : '--'}
          </div>
          <span className="text-xs text-zinc-500">Desiccation threshold</span>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Max Saturated</span>
          <div className="text-2xl font-extrabold text-blue-600">
            {maxRecorded !== '--' ? `${maxRecorded}%` : '--'}
          </div>
          <span className="text-xs text-zinc-500">Peak infiltration</span>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-agri-700" />
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">
              {selectedRange === 0 ? 'Live Telemetry Stream (1s sample frequency)' : `Historical Telemetry (${selectedRange}h Window)`}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartMode('moisture')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                chartMode === 'moisture'
                  ? 'bg-agri-800 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Moisture Index (%)
            </button>
            <button
              onClick={() => setChartMode('raw')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                chartMode === 'raw'
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              Raw ADC (0-1023)
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-72 w-full pt-2">
          {selectedRange === 0 ? (
            /* Live 60s Chart */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveHistory}>
                <defs>
                  <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2c5b3e" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2c5b3e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={chartMode === 'moisture' ? [0, 100] : [200, 1023]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                {chartMode === 'moisture' && (
                  <>
                    <ReferenceLine y={minMoisture} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Min (${minMoisture}%)`, fill: '#f59e0b', fontSize: 10 }} />
                    <ReferenceLine y={targetMoisture} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Target (${targetMoisture}%)`, fill: '#10b981', fontSize: 10 }} />
                    <Area type="monotone" dataKey="moisture" stroke="#2c5b3e" strokeWidth={2.5} fillOpacity={1} fill="url(#moistGrad)" isAnimationActive={false} />
                  </>
                )}
                {chartMode === 'raw' && (
                  <Line type="monotone" dataKey="raw" stroke="#0284c7" strokeWidth={2} dot={false} isAnimationActive={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : loading ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">Loading historical telemetry...</div>
          ) : historyData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No historical sensor samples saved for this window. Data records continuously when connected.
            </div>
          ) : (
            /* Historical Area Chart */
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2c5b3e" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#2c5b3e" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748b' }} minTickGap={30} />
                <YAxis domain={chartMode === 'moisture' ? [0, 100] : [200, 1023]} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                {chartMode === 'moisture' && (
                  <>
                    <ReferenceLine y={minMoisture} stroke="#f59e0b" strokeDasharray="3 3" />
                    <ReferenceLine y={targetMoisture} stroke="#10b981" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="moisture" stroke="#2c5b3e" strokeWidth={2} fillOpacity={1} fill="url(#histGrad)" />
                  </>
                )}
                {chartMode === 'raw' && (
                  <Line type="monotone" dataKey="raw" stroke="#0284c7" strokeWidth={1.5} dot={false} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
