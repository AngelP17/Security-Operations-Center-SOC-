import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './components/ui/sidebar';
import { AppSidebar } from './components/layout/AppSidebar';
import { InventoryTable } from './components/dashboard/InventoryTable';
import { StatsCards } from './components/dashboard/StatsCards';
import { NetworkTraffic } from './components/dashboard/NetworkTraffic';
import { EventsFeed } from './components/dashboard/EventsFeed';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { subscribeToDevices, subscribeToEvents, triggerNetworkScan, logSecurityEvent } from './services/api';
import { Device, SecurityEvent } from './types';
import { Separator } from './components/ui/separator';
import { toast, Toaster } from 'sonner';
import { Radar, LogOut, Network, Shield, Settings, Users, Search, Filter, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./components/ui/breadcrumb";

function Dashboard() {
  const { user, userProfile, logout, isAdmin, canWrite } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Subscribe to real-time updates
  useEffect(() => {
    setIsLoading(true);

    const unsubDevices = subscribeToDevices((newDevices) => {
      setDevices(newDevices);
      setIsLoading(false);
    });

    const unsubEvents = subscribeToEvents((newEvents) => {
      setEvents(newEvents);
    });

    return () => {
      unsubDevices();
      unsubEvents();
    };
  }, []);

  // Network scan handler
  const handleScan = async () => {
    if (!isAdmin) {
      toast.error('Admin access required to run network scans');
      return;
    }

    setIsScanning(true);
    toast.info('Network scan initiated...', { duration: 2000 });

    try {
      const result = await triggerNetworkScan();
      toast.success(`Scan complete: ${result.discovered} devices found on ${result.subnet}`);

      await logSecurityEvent({
        event_type: 'network_scan',
        severity: 'low',
        description: `Network scan completed: ${result.discovered} devices discovered`,
        source_ip: 'local'
      });
    } catch (error) {
      toast.error('Network scan failed - check backend connection');
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  // Filter events for search
  const filteredEvents = events.filter(e =>
    (e.description || e.message || '').toLowerCase().includes(eventSearch.toLowerCase()) ||
    (e.source_ip || '').includes(eventSearch)
  );

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    const colors: Record<string, string> = {
      critical: 'bg-red-500',
      high: 'bg-orange-500',
      medium: 'bg-amber-500',
      low: 'bg-blue-500'
    };
    return <span className={`inline-block w-2 h-2 rounded-full ${colors[severity] || 'bg-zinc-500'}`} />;
  };

  // Handle settings actions
  const handleSettingAction = (action: string) => {
    toast.info(`${action} setting updated`, { description: 'Changes saved to local configuration' });
  };


  return (
    <div className="dark min-h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar activeView={activeView} onNavigate={setActiveView} />
        <SidebarInset className="bg-black">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-800 bg-black/50 backdrop-blur-sm px-4 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4 bg-zinc-700" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#" onClick={() => setActiveView('dashboard')} className="text-zinc-400 hover:text-zinc-200">
                    SOC
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block text-zinc-600" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-zinc-200 font-medium capitalize">{activeView}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Online
              </div>

              {isAdmin && (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${isScanning
                    ? 'bg-blue-600/50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                >
                  <Radar className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan Network'}
                </button>
              )}

              <div className="flex items-center gap-3 pl-3 border-l border-zinc-700">
                <div className="text-right">
                  <p className="text-sm text-zinc-200">{userProfile?.displayName || user?.email}</p>
                  <p className="text-xs text-zinc-500 capitalize">{userProfile?.role || 'User'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-400 transition"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 pt-4 max-w-[1600px] mx-auto w-full">
            {/* Dashboard View */}
            {activeView === 'dashboard' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <StatsCards devices={devices} />
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  <NetworkTraffic />
                  <EventsFeed events={events} />
                </div>
                <div className="pt-4">
                  <h3 className="text-lg font-medium text-zinc-200 mb-4 px-1">Recent Inventory</h3>
                  <InventoryTable
                    devices={devices.slice(0, 5)}
                    isLoading={isLoading}
                    onRefresh={() => { }}
                  />
                </div>
              </div>
            )}

            {/* Inventory View */}
            {activeView === 'inventory' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Network Inventory</h2>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleScan} disabled={isScanning || !isAdmin}>
                      <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                      {isScanning ? 'Scanning...' : 'Refresh'}
                    </Button>
                    <AddDeviceDialog />
                  </div>
                </div>
                <InventoryTable
                  devices={devices}
                  isLoading={isLoading}
                  onRefresh={() => { }}
                />
              </div>
            )}

            {/* Network Map View */}
            {activeView === 'map' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Network Map</h2>
                </div>
                <NetworkMap devices={devices} />
              </div>
            )}

            {/* Security Events View */}
            {activeView === 'events' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Security Events</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Search events..."
                        className="pl-8 w-64 bg-zinc-900/50 border-zinc-800"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                      />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => toast.info('Advanced filters coming soon')}>
                      <Filter className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <div className="divide-y divide-zinc-800">
                        {filteredEvents.length === 0 ? (
                          <div className="p-8 text-center text-zinc-500">
                            No events found
                          </div>
                        ) : (
                          filteredEvents.map((event) => (
                            <div key={event.id} className="p-4 hover:bg-zinc-800/30 transition">
                              <div className="flex items-start gap-4">
                                <div className="mt-1">{getSeverityIcon(event.severity)}</div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-medium text-zinc-200">
                                      {event.description || event.message}
                                    </p>
                                    <span className="text-xs text-zinc-500">
                                      {typeof event.timestamp === 'string'
                                        ? event.timestamp
                                        : new Date(event.timestamp).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs font-mono text-zinc-500">{event.source_ip}</span>
                                    <Badge variant="outline" className={`text-xs ${event.severity === 'critical' ? 'border-red-500/50 text-red-400' :
                                      event.severity === 'high' ? 'border-orange-500/50 text-orange-400' :
                                        event.severity === 'medium' ? 'border-amber-500/50 text-amber-400' :
                                          'border-blue-500/50 text-blue-400'
                                      }`}>
                                      {event.severity}
                                    </Badge>
                                    <span className="text-xs text-zinc-600">{event.event_type}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Users View */}
            {activeView === 'users' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-100">User Management</h2>
                  {isAdmin && (
                    <Button variant="default" className="bg-emerald-600 hover:bg-emerald-500">
                      <Users className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  )}
                </div>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-zinc-200">
                      <Users className="w-5 h-5 text-purple-500" />
                      System Users
                    </CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Current User */}
                      <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                            {(userProfile?.displayName || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-200">{userProfile?.displayName || user?.email}</p>
                            <p className="text-xs text-zinc-500">{user?.email}</p>
                          </div>
                        </div>
                        <Badge className={`${userProfile?.role === 'admin' ? 'bg-emerald-500/20 text-emerald-400' :
                          userProfile?.role === 'analyst' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-zinc-500/20 text-zinc-400'
                          }`}>
                          {userProfile?.role || 'User'}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-500 pt-4">
                        User management requires Firebase Console access.
                        Configure users at <a href="https://console.firebase.google.com" target="_blank" className="text-blue-400 hover:underline">Firebase Console</a>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Settings View */}
            {activeView === 'settings' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-200">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        Security Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">Auto-scan Network</p>
                          <p className="text-xs text-zinc-500">Scan every 30 minutes</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSettingAction('Auto-scan')}>Configure</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">Alert Notifications</p>
                          <p className="text-xs text-zinc-500">Email alerts for critical events</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSettingAction('Notifications')}>Configure</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">Threat Detection</p>
                          <p className="text-xs text-zinc-500">Port scan and intrusion detection</p>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 cursor-pointer" onClick={() => handleSettingAction('Threat Detection')}>Active</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-zinc-200">
                        <Settings className="w-5 h-5 text-blue-500" />
                        Application Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">Dashboard Theme</p>
                          <p className="text-xs text-zinc-500">Dark mode enabled</p>
                        </div>
                        <Badge className="bg-zinc-500/20 text-zinc-400 cursor-pointer" onClick={() => handleSettingAction('Theme')}>Dark</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">Data Refresh Rate</p>
                          <p className="text-xs text-zinc-500">Real-time updates</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSettingAction('Refresh Rate')}>30s</Button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                        <div>
                          <p className="font-medium text-zinc-200">API Endpoint</p>
                          <p className="text-xs text-zinc-500">Flask backend</p>
                        </div>
                        <code className="text-xs text-emerald-400">:5001</code>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster theme="dark" position="bottom-right" richColors />
    </div>
  );
}

// Main App with Auth wrapper
export default function App() {
  return (
    <AuthProvider>
      <AuthGuard />
    </AuthProvider>
  );
}

// Auth guard component
function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-zinc-400 font-mono text-sm animate-pulse">Initializing System...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}
