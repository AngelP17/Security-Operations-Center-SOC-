import { useState, useMemo } from 'react';
import { Device, getPortInfo, isDangerousPort } from '../../types';
import { toggleTrustStatus, updateDevice, logSecurityEvent } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { Search, ShieldCheck, ShieldAlert, Monitor, WifiOff, AlertTriangle, Info } from 'lucide-react';
import { toast } from "sonner";

interface InventoryTableProps {
  devices: Device[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function InventoryTable({ devices, isLoading, onRefresh }: InventoryTableProps) {
  const { isAdmin, canWrite } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const ip = d.ip_address || d.ip || '';
      const mac = d.mac_address || d.mac || '';
      const hostname = d.hostname || '';
      const vendor = d.vendor || '';

      return hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ip.includes(searchTerm) ||
        mac.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [devices, searchTerm]);

  const handleToggleTrust = async (device: Device) => {
    if (!canWrite) {
      toast.error('Permission denied');
      return;
    }

    setUpdatingId(device.id);
    try {
      const newStatus = !device.is_authorized;
      await updateDevice(device.id, { is_authorized: newStatus });

      // Log the authorization event
      await logSecurityEvent({
        event_type: newStatus ? 'device_authorized' : 'device_revoked',
        severity: 'low',
        description: `Device ${device.hostname} (${device.ip_address || device.ip}) ${newStatus ? 'authorized' : 'revoked'}`,
        source_ip: device.ip_address || device.ip || ''
      });

      toast.success(`Device ${device.hostname} ${newStatus ? 'authorized' : 'revoked'}`);
    } catch (error) {
      toast.error("Failed to update trust status");
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: Device['status']) => {
    switch (status) {
      case 'online':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border-emerald-500/50 pl-2">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Online
          </Badge>
        );
      case 'offline':
        return <Badge variant="outline" className="text-zinc-500 border-zinc-700 bg-zinc-800/50"><WifiOff className="w-3 h-3 mr-1" /> Offline</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 border-amber-500/50"><AlertTriangle className="w-3 h-3 mr-1" /> Warning</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-500">Unknown</Badge>;
    }
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors = {
      critical: 'bg-red-500/15 text-red-500 border-red-500/50',
      high: 'bg-orange-500/15 text-orange-500 border-orange-500/50',
      medium: 'bg-amber-500/15 text-amber-500 border-amber-500/50',
      low: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/50'
    };
    return colors[riskLevel as keyof typeof colors] || colors.low;
  };

  // Render open ports with risk highlighting
  const renderPorts = (ports: string[] | undefined) => {
    if (!ports || ports.length === 0) {
      return <span className="text-zinc-500 text-xs">None</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 max-w-[180px]">
        {ports.slice(0, 5).map((port) => {
          const info = getPortInfo(port);
          const isDangerous = isDangerousPort(port);

          return (
            <TooltipProvider key={port}>
              <Tooltip>
                <TooltipTrigger>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${isDangerous
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                    }`}>
                    {port}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="bg-zinc-800 border-zinc-700">
                  <p className="font-medium">{info.name}</p>
                  <p className={`text-xs capitalize ${info.risk === 'critical' ? 'text-red-400' :
                      info.risk === 'high' ? 'text-orange-400' :
                        info.risk === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>Risk: {info.risk}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
        {ports.length > 5 && (
          <span className="text-xs text-zinc-500">+{ports.length - 5}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search IP, MAC, Hostname, Vendor..."
            className="pl-8 bg-zinc-900/50 border-zinc-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {filteredDevices.length} devices
        </div>
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-900/30">
        <Table>
          <TableHeader className="bg-zinc-900/80">
            <TableRow className="border-zinc-800 hover:bg-zinc-900/80">
              <TableHead className="text-zinc-400">Status</TableHead>
              <TableHead className="text-zinc-400">Hostname</TableHead>
              <TableHead className="text-zinc-400">IP Address</TableHead>
              <TableHead className="text-zinc-400">MAC Address</TableHead>
              <TableHead className="text-zinc-400">Vendor</TableHead>
              <TableHead className="text-zinc-400">Ports</TableHead>
              <TableHead className="text-zinc-400">Risk</TableHead>
              <TableHead className="text-zinc-400">Trust</TableHead>
              {canWrite && <TableHead className="text-right text-zinc-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 9 : 8} className="h-24 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
                    Loading network inventory...
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredDevices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 9 : 8} className="h-24 text-center text-muted-foreground">
                  No devices found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredDevices.map((device) => {
                const ip = device.ip_address || device.ip || '';
                const mac = device.mac_address || device.mac || '';
                const isAuthorized = device.is_authorized ?? device.is_trusted ?? false;

                return (
                  <TableRow
                    key={device.id}
                    className={`border-zinc-800 hover:bg-zinc-800/30 transition-colors ${!isAuthorized ? 'bg-red-500/5' : ''
                      }`}
                  >
                    <TableCell>{getStatusBadge(device.status)}</TableCell>

                    {/* Hostname with Forensic Tooltip */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="font-medium text-zinc-200 hover:text-blue-400 cursor-help">
                            {device.hostname}
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 border-zinc-700 max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-white">{device.hostname}</p>
                              <div className="text-xs space-y-0.5">
                                <p className="text-zinc-400">First seen: <span className="text-zinc-300">{device.first_seen}</span></p>
                                <p className="text-zinc-400">Last seen: <span className="text-zinc-300">{device.last_seen}</span></p>
                                {device.notes && <p className="text-zinc-400">Notes: <span className="text-zinc-300">{device.notes}</span></p>}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="font-mono text-blue-400">{ip}</TableCell>

                    {/* MAC with Vendor Tooltip */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="font-mono text-xs text-zinc-500 hover:text-zinc-300 cursor-help">
                            {mac || '-'}
                          </TooltipTrigger>
                          <TooltipContent className="bg-zinc-800 border-zinc-700">
                            <p className="font-medium">Device Info</p>
                            <p className="text-xs text-zinc-400">MAC: {mac || 'Unknown'}</p>
                            <p className="text-xs text-zinc-400">Vendor: {device.vendor}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-zinc-400">{device.vendor}</TableCell>
                    <TableCell>{renderPorts(device.open_ports)}</TableCell>

                    {/* Risk Level */}
                    <TableCell>
                      <Badge className={`capitalize ${getRiskBadge(device.risk_level || 'low')}`}>
                        {device.risk_level || 'low'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {isAuthorized ? (
                        <span className="flex items-center text-emerald-500 text-xs font-medium">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Trusted
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-500 text-xs font-medium">
                          <ShieldAlert className="w-3 h-3 mr-1" /> Untrusted
                        </span>
                      )}
                    </TableCell>

                    {canWrite && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={updatingId === device.id}
                          onClick={() => handleToggleTrust(device)}
                          className={isAuthorized
                            ? "text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                            : "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30"
                          }
                        >
                          {updatingId === device.id ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : (
                            isAuthorized ? "Revoke" : "Authorize"
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
