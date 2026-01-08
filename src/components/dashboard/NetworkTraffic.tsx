import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { fetchTrafficData } from "../../services/api";

interface TrafficDataPoint {
  time: string;
  inbound: number;
  outbound: number;
}

export function NetworkTraffic() {
  const [data, setData] = useState<TrafficDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrafficData = async () => {
      try {
        const result = await fetchTrafficData();
        const chartData: TrafficDataPoint[] = result.labels.map((label, i) => ({
          time: label,
          inbound: result.inbound[i],
          outbound: result.outbound[i],
        }));
        setData(chartData);
      } catch (error) {
        console.error("Failed to load traffic data:", error);
        // Fall back to sample data
        setData([
          { time: "00:00", inbound: 400, outbound: 240 },
          { time: "04:00", inbound: 300, outbound: 139 },
          { time: "08:00", inbound: 200, outbound: 980 },
          { time: "12:00", inbound: 278, outbound: 390 },
          { time: "16:00", inbound: 189, outbound: 480 },
          { time: "20:00", inbound: 239, outbound: 380 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrafficData();
    // Refresh every 60 seconds
    const interval = setInterval(loadTrafficData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="col-span-4 bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-zinc-200">Network Traffic</CardTitle>
        <CardDescription className="text-zinc-500">
          Inbound vs Outbound traffic (MB/s) over last 24h
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[200px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}MB`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  iconType="circle"
                />
                <Area
                  type="monotone"
                  dataKey="inbound"
                  name="Inbound"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorInbound)"
                />
                <Area
                  type="monotone"
                  dataKey="outbound"
                  name="Outbound"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOutbound)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
