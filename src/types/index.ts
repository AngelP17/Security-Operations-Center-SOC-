export type DeviceStatus = 'online' | 'offline' | 'warning';
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface Device {
  id: string;
  ip_address: string;
  hostname: string;
  mac_address: string;
  vendor: string;
  status: DeviceStatus;
  is_authorized: boolean;
  open_ports: string[];  // e.g., ["22", "80", "443", "3389"]
  risk_level: RiskLevel;
  first_seen: Date | string;
  last_seen: Date | string;
  notes?: string;
  // Legacy fields for compatibility
  ip?: string;
  mac?: string;
  is_trusted?: boolean;
  ping_ms?: number;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: Severity;
  description: string;
  source_ip: string;
  timestamp: Date | string;
  // Legacy fields for compatibility
  message?: string;
}

// Port risk classification
export const DANGEROUS_PORTS: Record<string, { name: string; risk: RiskLevel }> = {
  '21': { name: 'FTP', risk: 'high' },
  '22': { name: 'SSH', risk: 'medium' },
  '23': { name: 'Telnet', risk: 'critical' },
  '25': { name: 'SMTP', risk: 'medium' },
  '80': { name: 'HTTP', risk: 'low' },
  '110': { name: 'POP3', risk: 'medium' },
  '135': { name: 'RPC', risk: 'high' },
  '139': { name: 'NetBIOS', risk: 'high' },
  '143': { name: 'IMAP', risk: 'medium' },
  '443': { name: 'HTTPS', risk: 'low' },
  '445': { name: 'SMB', risk: 'high' },
  '1433': { name: 'MSSQL', risk: 'high' },
  '1521': { name: 'Oracle', risk: 'high' },
  '3306': { name: 'MySQL', risk: 'medium' },
  '3389': { name: 'RDP', risk: 'critical' },
  '5432': { name: 'PostgreSQL', risk: 'medium' },
  '5900': { name: 'VNC', risk: 'critical' },
  '8080': { name: 'HTTP-Alt', risk: 'low' }
};

// Helper to get port display info
export function getPortInfo(port: string): { name: string; risk: RiskLevel } {
  return DANGEROUS_PORTS[port] || { name: `Port ${port}`, risk: 'low' };
}

// Helper to check if port is dangerous
export function isDangerousPort(port: string): boolean {
  const info = DANGEROUS_PORTS[port];
  return info ? ['critical', 'high'].includes(info.risk) : false;
}
