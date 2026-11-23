import React from 'react';
import { Droplet, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export const MoistureGauge = ({ moisturePct, rawAdc, status, minThreshold = 45, targetThreshold = 65, isDisconnected = false }) => {
  const percentage = isDisconnected || moisturePct === null || moisturePct === undefined ? 0 : Math.min(100, Math.max(0, moisturePct));
  
  // Calculate SVG stroke circle
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let colorClass = 'text-agri-600';
  let bgArcClass = 'stroke-zinc-200';
  let statusText = 'Optimal';
  let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  let Icon = CheckCircle2;

  if (isDisconnected) {
    colorClass = 'text-zinc-400';
    statusText = 'Disconnected';
    badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';
    Icon = AlertTriangle;
  } else if (status === 'CRITICAL_DRY' || percentage < (minThreshold - 15)) {
    colorClass = 'text-red-500';
    statusText = 'Critically Dry';
    badgeClass = 'bg-red-50 text-red-800 border-red-200';
    Icon = ShieldAlert;
  } else if (status === 'DRY' || percentage < minThreshold) {
    colorClass = 'text-amber-500';
    statusText = 'Needs Water';
    badgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = AlertTriangle;
  } else if (status === 'WET' || percentage > 85) {
    colorClass = 'text-blue-500';
    statusText = 'Saturated / Wet';
    badgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
    Icon = Droplet;
  }

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        {/* SVG Gauge */}
        <svg className="w-52 h-52 transform -rotate-90">
          <circle
            cx="104"
            cy="104"
            r={radius}
            stroke="currentColor"
            strokeWidth="14"
            className="text-zinc-100"
            fill="transparent"
          />
          {/* Active progress */}
          <circle
            cx="104"
            cy="104"
            r={radius}
            stroke="currentColor"
            strokeWidth="14"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`${colorClass} transition-all duration-700 ease-out`}
            fill="transparent"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <Droplet className={`w-6 h-6 mb-1 ${colorClass}`} />
          <span className="text-4xl font-extrabold tracking-tight text-zinc-900">
            {isDisconnected ? '--' : `${percentage.toFixed(0)}%`}
          </span>
          <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mt-0.5">
            Moisture Index
          </span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
          <Icon className="w-3.5 h-3.5" />
          {statusText}
        </span>
      </div>

      {/* Raw Reading & Thresholds */}
      <div className="mt-3 grid grid-cols-3 gap-2 w-full max-w-xs text-center text-xs text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-200/80">
        <div>
          <span className="block text-zinc-400 font-medium">Raw ADC</span>
          <span className="font-semibold text-zinc-800">{rawAdc !== null && rawAdc !== undefined ? rawAdc : 'N/A'}</span>
        </div>
        <div className="border-x border-zinc-200">
          <span className="block text-zinc-400 font-medium">Min Target</span>
          <span className="font-semibold text-zinc-800">{minThreshold}%</span>
        </div>
        <div>
          <span className="block text-zinc-400 font-medium">Full Target</span>
          <span className="font-semibold text-zinc-800">{targetThreshold}%</span>
        </div>
      </div>
    </div>
  );
};
