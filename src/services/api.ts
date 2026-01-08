import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { Device, SecurityEvent } from '../types';

// Collection paths - using appId pattern for isolation
const APP_ID = 'soc-dashboard';
const DEVICES_COLLECTION = `artifacts/${APP_ID}/public/data/network_devices`;
const EVENTS_COLLECTION = `artifacts/${APP_ID}/public/data/security_events`;

// Helper to convert Firestore timestamp to string
const formatTimestamp = (ts: Timestamp | Date | string | undefined): string => {
  if (!ts) return 'Unknown';
  if (typeof ts === 'string') return ts;
  if (ts instanceof Timestamp) {
    return ts.toDate().toLocaleString();
  }
  if (ts instanceof Date) {
    return ts.toLocaleString();
  }
  return 'Unknown';
};

// --- DEVICE FUNCTIONS ---

// Subscribe to real-time device updates
export function subscribeToDevices(callback: (devices: Device[]) => void): () => void {
  const q = query(
    collection(db, DEVICES_COLLECTION),
    orderBy('last_seen', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const devices: Device[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ip_address: data.ip_address || data.ip || '',
        hostname: data.hostname || 'Unknown',
        mac_address: data.mac_address || data.mac || '',
        vendor: data.vendor || 'Unknown',
        status: data.status || 'offline',
        is_authorized: data.is_authorized ?? data.is_trusted ?? false,
        open_ports: data.open_ports || [],
        risk_level: data.risk_level || 'low',
        first_seen: formatTimestamp(data.first_seen),
        last_seen: formatTimestamp(data.last_seen),
        notes: data.notes || '',
        // Legacy compatibility
        ip: data.ip_address || data.ip || '',
        mac: data.mac_address || data.mac || '',
        is_trusted: data.is_authorized ?? data.is_trusted ?? false,
        ping_ms: data.ping_ms || 0
      };
    });
    callback(devices);
  }, (error) => {
    console.error('Error subscribing to devices:', error);
  });
}

// Fetch devices once (for non-realtime scenarios)
export async function fetchInventory(): Promise<Device[]> {
  try {
    const q = query(
      collection(db, DEVICES_COLLECTION),
      orderBy('last_seen', 'desc')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ip_address: data.ip_address || data.ip || '',
        hostname: data.hostname || 'Unknown',
        mac_address: data.mac_address || data.mac || '',
        vendor: data.vendor || 'Unknown',
        status: data.status || 'offline',
        is_authorized: data.is_authorized ?? data.is_trusted ?? false,
        open_ports: data.open_ports || [],
        risk_level: data.risk_level || 'low',
        first_seen: formatTimestamp(data.first_seen),
        last_seen: formatTimestamp(data.last_seen),
        notes: data.notes || '',
        ip: data.ip_address || data.ip || '',
        mac: data.mac_address || data.mac || '',
        is_trusted: data.is_authorized ?? data.is_trusted ?? false,
        ping_ms: data.ping_ms || 0
      };
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return [];
  }
}

// Add a new device
export async function addDevice(device: Omit<Device, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, DEVICES_COLLECTION), {
    ...device,
    first_seen: Timestamp.now(),
    last_seen: Timestamp.now()
  });
  return docRef.id;
}

// Update device (e.g., authorize)
export async function updateDevice(deviceId: string, updates: Partial<Device>): Promise<void> {
  const docRef = doc(db, DEVICES_COLLECTION, deviceId);
  await updateDoc(docRef, {
    ...updates,
    last_seen: Timestamp.now()
  });
}

// Toggle authorization status
export async function toggleTrustStatus(deviceId: string): Promise<void> {
  // This would need to read current status first, then toggle
  // For simplicity, this is a placeholder - in real implementation,
  // you'd use a transaction or read the current value first
  console.log(`Toggling trust for device ${deviceId}`);
}

// Delete device
export async function deleteDevice(deviceId: string): Promise<void> {
  await deleteDoc(doc(db, DEVICES_COLLECTION, deviceId));
}

// --- SECURITY EVENTS FUNCTIONS ---

// Subscribe to real-time event updates
export function subscribeToEvents(callback: (events: SecurityEvent[]) => void): () => void {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const events: SecurityEvent[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        event_type: data.event_type || 'info',
        severity: data.severity || 'low',
        description: data.description || data.message || '',
        source_ip: data.source_ip || '',
        timestamp: formatTimestamp(data.timestamp),
        message: data.description || data.message || ''
      };
    });
    callback(events);
  }, (error) => {
    console.error('Error subscribing to events:', error);
  });
}

// Fetch events once
export async function fetchEvents(): Promise<SecurityEvent[]> {
  try {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        event_type: data.event_type || 'info',
        severity: data.severity || 'low',
        description: data.description || data.message || '',
        source_ip: data.source_ip || '',
        timestamp: formatTimestamp(data.timestamp),
        message: data.description || data.message || ''
      };
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}

// Log a new security event
export async function logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<string> {
  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    ...event,
    timestamp: Timestamp.now()
  });
  return docRef.id;
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
