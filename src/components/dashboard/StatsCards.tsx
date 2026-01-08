import { Device } from "../../types";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Server, ShieldAlert, Activity, Wifi } from "lucide-react";

interface StatsCardsProps {
  devices: Device[];
}

export function StatsCards({ devices }: StatsCardsProps) {
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.status === 'online').length;
  const offlineDevices = devices.filter(d => d.status === 'offline').length;
  const untrustedDevices = devices.filter(d => !(d.is_authorized ?? d.is_trusted) && d.status !== 'offline').length;
  const warningDevices = devices.filter(d => d.status === 'warning' || d.risk_level === 'high' || d.risk_level === 'critical').length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400">Total Inventory</CardTitle>
          <Server className="h-4 w-4 text-zinc-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-zinc-100">{totalDevices}</div>
          <p className="text-xs text-zinc-500">
            {onlineDevices} online, {offlineDevices} offline
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400">Security Risks</CardTitle>
          <ShieldAlert className="h-4 w-4 text-rose-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-rose-500">{untrustedDevices}</div>
          <p className="text-xs text-zinc-500">
            Active untrusted devices
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400">Network Health</CardTitle>
          <Activity className="h-4 w-4 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-500">{(onlineDevices / (totalDevices || 1) * 100).toFixed(0)}%</div>
          <p className="text-xs text-zinc-500">
            Uptime average
          </p>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-zinc-400">Warnings</CardTitle>
          <Wifi className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{warningDevices}</div>
          <p className="text-xs text-zinc-500">
            High latency or packet loss
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
