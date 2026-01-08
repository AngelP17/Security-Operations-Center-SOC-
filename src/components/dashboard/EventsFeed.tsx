import { SecurityEvent } from "../../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";

interface EventsFeedProps {
  events: SecurityEvent[];
}

export function EventsFeed({ events }: EventsFeedProps) {
  const getSeverityIcon = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-rose-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-slate-500" />;
    }
  };

  const getSeverityBadge = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20">Critical</Badge>;
      case 'high':
        return <Badge variant="default" className="bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20">High</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-blue-500 border-blue-500/20">Low</Badge>;
    }
  };

  return (
    <Card className="col-span-3 bg-slate-900/50 border-slate-800 flex flex-col h-[350px]">
      <CardHeader>
        <CardTitle className="text-slate-200">Security Events</CardTitle>
        <CardDescription className="text-slate-500">
          Real-time security alerts and logs
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center text-sm text-slate-500 py-4">No recent events</div>
            ) : (
              events.map((event) => (
                <div key={event.id} className="flex items-start space-x-4 border-b border-slate-800/50 pb-4 last:border-0 last:pb-0">
                  <div className="mt-1">
                    {getSeverityIcon(event.severity)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200">{event.message}</p>
                      <span className="text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">{event.source_ip}</span>
                      {getSeverityBadge(event.severity)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
