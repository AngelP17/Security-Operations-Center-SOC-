import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from '../../contexts/AuthContext';
import { addDevice, logSecurityEvent } from '../../services/api';
import { toast } from 'sonner';
import { PlusCircle, Loader2 } from 'lucide-react';
import { Device } from '../../types';

interface AddDeviceFormData {
    hostname: string;
    ip_address: string;
    mac_address: string;
    vendor: string;
    type: string;
    status: string;
}

export function AddDeviceDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { register, handleSubmit, reset, formState: { errors } } = useForm<AddDeviceFormData>();
    const { canWrite } = useAuth();

    const onSubmit = async (data: AddDeviceFormData) => {
        setIsLoading(true);
        try {
            // Create new device object
            const newDevice: Omit<Device, 'id'> = {
                hostname: data.hostname,
                ip_address: data.ip_address,
                mac_address: data.mac_address,
                vendor: data.vendor,
                status: 'online' as const, // Default to online for manual add
                is_authorized: true, // Manual add implies trust
                open_ports: [],
                risk_level: 'low',
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                notes: `Manually added via dashboard`,
                // Legacy fields
                ip: data.ip_address,
                mac: data.mac_address,
                is_trusted: true,
                ping_ms: 0
            };

            await addDevice(newDevice);

            await logSecurityEvent({
                event_type: 'device_added',
                severity: 'low',
                description: `Device manually added: ${data.hostname} (${data.ip_address})`,
                source_ip: data.ip_address
            });

            toast.success('Device added successfully');
            setOpen(false);
            reset();
        } catch (error) {
            console.error(error);
            toast.error('Failed to add device');
        } finally {
            setIsLoading(false);
        }
    };

    if (!canWrite) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add Device
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Add New Device</DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        Manually register a device in the network inventory.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="hostname">Hostname</Label>
                            <Input
                                id="hostname"
                                placeholder="web-server-01"
                                className="bg-zinc-800 border-zinc-700"
                                {...register('hostname', { required: true })}
                            />
                            {errors.hostname && <span className="text-xs text-red-400">Required</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="ip">IP Address</Label>
                            <Input
                                id="ip"
                                placeholder="192.168.1.10"
                                className="bg-zinc-800 border-zinc-700"
                                {...register('ip_address', {
                                    required: true,
                                    pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
                                })}
                            />
                            {errors.ip_address && <span className="text-xs text-red-400">Invalid IP</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mac">MAC Address</Label>
                            <Input
                                id="mac"
                                placeholder="AA:BB:CC:DD:EE:FF"
                                className="bg-zinc-800 border-zinc-700"
                                {...register('mac_address')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="vendor">Vendor</Label>
                            <Input
                                id="vendor"
                                placeholder="Cisco, Dell, Apple..."
                                className="bg-zinc-800 border-zinc-700"
                                {...register('vendor')}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-500">
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Add Device
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
