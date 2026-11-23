"""
SoilSense Arduino USB Serial Manager
Handles hardware discovery, serial connection, resilient reading, command dispatch,
and automatic reconnection on USB disconnects.
"""

import json
import time
import threading
from typing import List, Optional, Callable, Dict, Any
import serial
import serial.tools.list_ports
from config import DEFAULT_BAUD_RATE, SERIAL_TIMEOUT_SECONDS, SERIAL_RECONNECT_INTERVAL_SECONDS

class ArduinoManager:
    def __init__(self, port: str = "AUTO", baud_rate: int = DEFAULT_BAUD_RATE):
        self.requested_port = port
        self.actual_port: Optional[str] = None
        self.baud_rate = baud_rate
        self.serial_conn: Optional[serial.Serial] = None
        self.is_connected = False
        self.is_running = False
        self.simulated_mode = False  # Explicit virtual mode only if user enables demo

        self.thread: Optional[threading.Thread] = None
        self.lock = threading.RLock()

        # Callbacks
        self.on_sensor_data: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_pump_status: Optional[Callable[[Dict[str, Any]], None]] = None
        self.on_connection_change: Optional[Callable[[bool, str], None]] = None

        # Tracking state
        self.last_rx_timestamp = 0.0
        self.last_tx_timestamp = 0.0
        self.last_ping_timestamp = 0.0
        self.latest_raw_adc: Optional[int] = None
        self.latest_pump_state: str = "OFF"
        self.consecutive_errors = 0

    @staticmethod
    def get_available_ports() -> List[Dict[str, str]]:
        ports = []
        for port in serial.tools.list_ports.comports():
            desc = port.description or ""
            hwid = port.hwid or ""
            is_arduino_candidate = any(keyword in (desc + hwid).lower() for keyword in [
                "arduino", "ch340", "ftdi", "cp210", "usb serial", "usb-serial", "wch"
            ])
            ports.append({
                "port": port.device,
                "description": desc,
                "is_candidate": is_arduino_candidate
            })
        return ports

    def auto_detect_port(self) -> Optional[str]:
        ports = self.get_available_ports()
        # First priority: marked candidate
        for p in ports:
            if p["is_candidate"]:
                return p["port"]
        # Second priority: any COM port on Windows if available
        if ports:
            return ports[0]["port"]
        return None

    def start(self):
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True, name="SoilSense-SerialThread")
        self.thread.start()

    def stop(self):
        self.is_running = False
        self._disconnect()
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)

    def set_port(self, port: str):
        with self.lock:
            self.requested_port = port
        self._disconnect()

    def set_simulated_mode(self, enabled: bool):
        with self.lock:
            self.simulated_mode = enabled
            if enabled:
                self.is_connected = True
                if self.on_connection_change:
                    self.on_connection_change(True, "VIRTUAL_SIMULATION")
            else:
                self.is_connected = False
                self._disconnect()

    def _connect(self) -> bool:
        if self.simulated_mode:
            self.is_connected = True
            return True

        target_port = self.requested_port
        if target_port == "AUTO" or not target_port:
            target_port = self.auto_detect_port()

        if not target_port:
            return False

        try:
            conn = serial.Serial(
                port=target_port,
                baudrate=self.baud_rate,
                timeout=SERIAL_TIMEOUT_SECONDS,
                write_timeout=1.0
            )
            # Give Arduino Uno ~2s to boot through DTR reset
            time.sleep(1.8)
            conn.reset_input_buffer()
            conn.reset_output_buffer()

            with self.lock:
                self.serial_conn = conn
                self.actual_port = target_port
                self.is_connected = True
                self.consecutive_errors = 0

            if self.on_connection_change:
                self.on_connection_change(True, target_port)

            # Send ping
            self.send_command({"command": "ping"})
            return True
        except Exception as e:
            self._disconnect()
            return False

    def _disconnect(self):
        with self.lock:
            if self.serial_conn:
                try:
                    self.serial_conn.close()
                except Exception:
                    pass
                self.serial_conn = None
            was_connected = self.is_connected
            self.is_connected = False
            self.actual_port = None

        if was_connected and self.on_connection_change:
            self.on_connection_change(False, "Disconnected")

    def send_command(self, cmd_dict: Dict[str, Any]) -> bool:
        payload = json.dumps(cmd_dict) + "\n"
        if self.simulated_mode:
            # Handle simulated echo
            if cmd_dict.get("command") == "pump" or "pump" in cmd_dict:
                state = cmd_dict.get("state", cmd_dict.get("pump", "OFF"))
                self.latest_pump_state = state
                if self.on_pump_status:
                    self.on_pump_status({"state": state, "reason": "simulated_command"})
            return True

        with self.lock:
            if not self.serial_conn or not self.is_connected:
                return False
            try:
                self.serial_conn.write(payload.encode("utf-8"))
                self.serial_conn.flush()
                self.last_tx_timestamp = time.time()
                return True
            except Exception as e:
                self.consecutive_errors += 1
                if self.consecutive_errors > 2:
                    self._disconnect()
                return False

    def send_pump_command(self, state: str) -> bool:
        """state must be 'ON' or 'OFF'"""
        state_clean = state.upper()
        return self.send_command({"command": "pump", "state": state_clean})

    def send_ping(self) -> bool:
        return self.send_command({"command": "ping"})

    def _run_loop(self):
        simulated_moisture_raw = 650
        while self.is_running:
            if self.simulated_mode:
                # Provide simulated behavior for bench testing without hardware
                time.sleep(1.0)
                if self.latest_pump_state == "ON":
                    # Soil getting wetter (lower raw ADC)
                    simulated_moisture_raw = max(350, simulated_moisture_raw - 12)
                else:
                    # Soil gradually drying (higher raw ADC)
                    simulated_moisture_raw = min(820, simulated_moisture_raw + 2)

                data = {
                    "type": "sensor",
                    "raw": simulated_moisture_raw,
                    "pin": "A1",
                    "status": "ok",
                    "uptime_ms": int(time.time() * 1000) % 1000000,
                    "pump_state": self.latest_pump_state,
                    "simulated": True
                }
                self.latest_raw_adc = simulated_moisture_raw
                if self.on_sensor_data:
                    self.on_sensor_data(data)
                continue

            # Real hardware loop
            if not self.is_connected:
                success = self._connect()
                if not success:
                    time.sleep(SERIAL_RECONNECT_INTERVAL_SECONDS)
                    continue

            # Connected: Read lines from Arduino
            try:
                line = self.serial_conn.readline()
                if line:
                    line_str = line.decode("utf-8", errors="replace").strip()
                    if line_str.startswith("{") and line_str.endswith("}"):
                        try:
                            msg = json.loads(line_str)
                            self._handle_incoming_json(msg)
                        except json.JSONDecodeError:
                            pass
                else:
                    # Timeout on read, send watchdog ping if pump is on
                    now = time.time()
                    if self.latest_pump_state == "ON" and (now - self.last_ping_timestamp > 4.0):
                        self.send_ping()
                        self.last_ping_timestamp = now

            except (serial.SerialException, OSError) as e:
                self.consecutive_errors += 1
                if self.consecutive_errors >= 2:
                    self._disconnect()
                    time.sleep(SERIAL_RECONNECT_INTERVAL_SECONDS)
            except Exception:
                pass

    def _handle_incoming_json(self, msg: Dict[str, Any]):
        msg_type = msg.get("type")
        self.last_rx_timestamp = time.time()

        if msg_type == "sensor":
            self.latest_raw_adc = msg.get("raw")
            if "pump_state" in msg:
                self.latest_pump_state = msg["pump_state"]
            if self.on_sensor_data:
                self.on_sensor_data(msg)

        elif msg_type == "pump_status":
            self.latest_pump_state = msg.get("state", "OFF")
            if self.on_pump_status:
                self.on_pump_status(msg)

        elif msg_type == "alert":
            # Pass alert or sync pump
            if "TIMEOUT" in msg.get("code", ""):
                self.latest_pump_state = "OFF"
