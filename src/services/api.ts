import { Device, SecurityEvent } from '../types';

// --- DEVICE FUNCTIONS ---

// Subscribe to real-time device updates from Flask backend
export function subscribeToDevices(callback: (devices: Device[]) => void): () => void {
  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/security/inventory');
      if (!response.ok) throw new Error('Failed to fetch devices');
      const data = await response.json();

      // Flask returns array directly
      const devicesArray = Array.isArray(data) ? data : (data.devices || []);

      const devices: Device[] = devicesArray.map((device: any) => ({
        id: device.id || device.ip_address,
        ip_address: device.ip_address || device.ip || '',
        hostname: device.hostname || 'Unknown',
        mac_address: device.mac_address || device.mac || '',
        vendor: device.vendor || 'Unknown',
        status: device.status === 'up' ? 'online' : 'offline',
        is_authorized: Boolean(device.is_authorized),
        open_ports: Array.isArray(device.open_ports) ? device.open_ports :
                    (device.open_ports ? String(device.open_ports).split(',').filter(Boolean) : []),
        risk_level: device.risk_level || 'low',
        first_seen: device.first_seen || new Date().toISOString(),
        last_seen: device.last_seen || new Date().toISOString(),
        notes: device.notes || '',
        ip: device.ip_address || device.ip || '',
        mac: device.mac_address || device.mac || '',
        is_trusted: Boolean(device.is_authorized),
        ping_ms: device.ping_ms || 0
      }));

      callback(devices);
    } catch (error) {
      console.error('Error fetching devices from Flask backend:', error);
      callback([]);
    }
  };

  fetchDevices();
  const interval = setInterval(fetchDevices, 5000);
  return () => clearInterval(interval);
}

// Fetch devices once (for non-realtime scenarios)
export async function fetchInventory(): Promise<Device[]> {
  try {
    const response = await fetch('/api/security/inventory');
    if (!response.ok) throw new Error('Failed to fetch devices');
    const data = await response.json();
    const devicesArray = Array.isArray(data) ? data : (data.devices || []);

    return devicesArray.map((device: any) => ({
      id: device.id || device.ip_address,
      ip_address: device.ip_address || device.ip || '',
      hostname: device.hostname || 'Unknown',
      mac_address: device.mac_address || device.mac || '',
      vendor: device.vendor || 'Unknown',
      status: device.status === 'up' ? 'online' : 'offline',
      is_authorized: Boolean(device.is_authorized),
      open_ports: Array.isArray(device.open_ports) ? device.open_ports :
                  (device.open_ports ? String(device.open_ports).split(',').filter(Boolean) : []),
      risk_level: device.risk_level || 'low',
      first_seen: device.first_seen || new Date().toISOString(),
      last_seen: device.last_seen || new Date().toISOString(),
      notes: device.notes || '',
      ip: device.ip_address || device.ip || '',
      mac: device.mac_address || device.mac || '',
      is_trusted: Boolean(device.is_authorized),
      ping_ms: device.ping_ms || 0
    }));
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
}

// Add a new device - currently placeholder
export async function addDevice(device: Omit<Device, 'id'>): Promise<string> {
  console.log('Add device not yet implemented in Flask backend', device);
  return device.ip_address;
}

// Update device authorization via Flask backend
export async function updateDevice(deviceId: string, updates: Partial<Device>): Promise<void> {
  try {
    if ('is_authorized' in updates) {
      const response = await fetch(`/api/security/authorize/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to update device authorization');
    }
  } catch (error) {
    console.error('Error updating device:', error);
    throw error;
  }
}

// Toggle authorization status - placeholder
export async function toggleTrustStatus(deviceId: string): Promise<void> {
  console.log(`Toggling trust for device ${deviceId}`);
}

// Delete device - placeholder
export async function deleteDevice(deviceId: string): Promise<void> {
  console.log(`Delete device ${deviceId} not implemented`);
}

// --- SECURITY EVENTS FUNCTIONS ---

// Subscribe to real-time event updates from Flask backend
export function subscribeToEvents(callback: (events: SecurityEvent[]) => void): () => void {
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/security/events');
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();

      const eventsArray = Array.isArray(data) ? data : (data.events || []);

      const events: SecurityEvent[] = eventsArray.map((event: any) => ({
        id: String(event.id || Math.random()),
        event_type: event.event_type || 'info',
        severity: event.severity || 'low',
        description: event.description || event.message || '',
        source_ip: event.ip_address || event.source_ip || '',
        timestamp: event.time || event.timestamp || new Date().toLocaleTimeString(),
        message: event.description || event.message || ''
      }));

      callback(events);
    } catch (error) {
      console.error('Error fetching events from Flask backend:', error);
      callback([]);
    }
  };

  fetchEvents();
  const interval = setInterval(fetchEvents, 10000);
  return () => clearInterval(interval);
}

// Fetch events once
export async function fetchEvents(): Promise<SecurityEvent[]> {
  try {
    const response = await fetch('/api/security/events');
    if (!response.ok) throw new Error('Failed to fetch events');
    const data = await response.json();
    const eventsArray = Array.isArray(data) ? data : (data.events || []);

    return eventsArray.map((event: any) => ({
      id: String(event.id || Math.random()),
      event_type: event.event_type || 'info',
      severity: event.severity || 'low',
      description: event.description || event.message || '',
      source_ip: event.ip_address || event.source_ip || '',
      timestamp: event.time || event.timestamp || new Date().toLocaleTimeString(),
      message: event.description || event.message || ''
    }));
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Log a new security event to Flask backend
export async function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<string> {
  try {
    const response = await fetch('/api/security/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: event.event_type,
        severity: event.severity,
        description: event.description || event.message,
        ip_address: event.source_ip || 'local'
      })
    });
    if (!response.ok) throw new Error('Failed to log event');
    const data = await response.json();
    return String(data.id || Math.random());
  } catch (error) {
    console.error('Error logging security event:', error);
    return String(Math.random());
  }
}

// --- NETWORK SCAN (calls Flask backend) ---
export async function triggerNetworkScan(): Promise<{ discovered: number; subnet: string }> {
  try {
    const response = await fetch('/api/security/scan', { method: 'POST' });
    if (!response.ok) throw new Error('Scan failed');
    return await response.json();
  } catch (error) {
    console.error('Network scan error:', error);
    throw error;
  }
}

// --- TRAFFIC DATA (from Flask backend) ---
export async function fetchTrafficData(): Promise<{ labels: string[]; inbound: number[]; outbound: number[] }> {
  try {
    const response = await fetch('/api/traffic');
    if (!response.ok) throw new Error('Failed to fetch traffic data');
    return await response.json();
  } catch (error) {
    // Return simulated data if backend not available
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const inbound = labels.map(() => Math.floor(Math.random() * 400) + 100);
    const outbound = labels.map(() => Math.floor(Math.random() * 500) + 150);
    return { labels, inbound, outbound };
  }
}
