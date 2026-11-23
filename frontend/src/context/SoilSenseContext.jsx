import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { api } from '../services/api';

const SoilSenseContext = createContext(null);

export const SoilSenseProvider = ({ children }) => {
  const [status, setStatus] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [liveHistory, setLiveHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const refreshStatus = async () => {
    try {
      const data = await api.getStatus();
      setStatus(data);
      setLoading(false);
    } catch (err) {
      console.warn('REST status fetch error:', err.message);
    }
  };

  // Connect WebSocket
  useEffect(() => {
    let isMounted = true;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev mode, connect to backend port 8000 if running through localhost, or use relative ws proxy
      const host = window.location.port === '3000' 
        ? `${window.location.hostname}:8000` 
        : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/live`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setWsConnected(true);
        console.log('Connected to SoilSense WebSocket feed');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            setStatus(data);
            setLoading(false);

            if (data.moisture_index_pct !== null && data.moisture_index_pct !== undefined) {
              setLiveHistory((prev) => {
                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                const next = [...prev, {
                  time: timeStr,
                  moisture: data.moisture_index_pct,
                  raw: data.raw_adc,
                  pump: data.pump_state === 'ON' ? 100 : 0
                }];
                return next.slice(-60); // keep last 60 seconds
              });
            }
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setWsConnected(false);
        // Attempt reconnect after 2s
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = (error) => {
        // Handled by close event
        ws.close();
      };
    };

    // Initial fetch
    refreshStatus();
    connectWebSocket();

    return () => {
      isMounted = false;
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const handleSetMode = async (mode) => {
    try {
      await api.setIrrigationMode(mode);
      showToast(`Switched irrigation mode to ${mode.toUpperCase()}`, 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStartPump = async (durationSec = 20, reason = 'Manual trigger from web UI') => {
    try {
      await api.startIrrigation(durationSec, reason);
      showToast(`Pump activated for ${durationSec} seconds.`, 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleStopPump = async () => {
    try {
      await api.stopIrrigation();
      showToast('Pump deactivated.', 'info');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await api.emergencyStop();
      showToast('EMERGENCY STOP ENGAGED: Pump shutdown & locked out!', 'error');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleResetEmergency = async () => {
    try {
      await api.resetEmergency();
      showToast('Emergency lockout cleared. System returned to standby.', 'success');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleSimulation = async (enabled) => {
    try {
      await api.toggleSimulation(enabled);
      showToast(enabled ? 'Virtual Simulation Mode Activated (Hardware bypassed)' : 'Virtual Simulation Disabled (Probing real USB)', 'info');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSetPort = async (port) => {
    try {
      await api.setPort(port);
      showToast(`Selected serial port: ${port}`, 'info');
      refreshStatus();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <SoilSenseContext.Provider
      value={{
        status,
        wsConnected,
        liveHistory,
        loading,
        toast,
        showToast,
        refreshStatus,
        setMode: handleSetMode,
        startPump: handleStartPump,
        stopPump: handleStopPump,
        emergencyStop: handleEmergencyStop,
        resetEmergency: handleResetEmergency,
        toggleSimulation: handleToggleSimulation,
        setPort: handleSetPort
      }}
    >
      {children}
    </SoilSenseContext.Provider>
  );
};

export const useSoilSense = () => {
  const context = useContext(SoilSenseContext);
  if (!context) {
    throw new Error('useSoilSense must be used within a SoilSenseProvider');
  }
  return context;
};
