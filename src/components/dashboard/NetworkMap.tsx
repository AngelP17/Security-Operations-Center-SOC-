import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Device } from "../../types";
import { Network, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";

interface NetworkMapProps {
    devices: Device[];
}

interface Node {
    id: string;
    x: number;
    y: number;
    type: 'router' | 'server' | 'workstation' | 'printer' | 'unknown';
    status: 'online' | 'offline' | 'warning';
    label: string;
}

interface Link {
    source: string;
    target: string;
}

export function NetworkMap({ devices }: NetworkMapProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

    // Initialize nodes and links from devices
    useEffect(() => {
        if (!devices.length) return;

        // Center node (Gateway)
        const centerX = 400;
        const centerY = 250;

        // Create gateway node
        const gatewayNode: Node = {
            id: 'gateway',
            x: centerX,
            y: centerY,
            type: 'router',
            status: 'online',
            label: 'Gateway'
        };

        // Distribute other nodes in a circle
        const updatedNodes: Node[] = [gatewayNode];
        const updatedLinks: Link[] = [];

        const radius = 200;
        const angleStep = (2 * Math.PI) / (devices.length || 1);

        devices.forEach((device, index) => {
            const angle = index * angleStep;
            // Identify type based on vendor or ports
            let type: Node['type'] = 'unknown';
            const vendor = (device.vendor || '').toLowerCase();
            if (vendor.includes('cisco') || vendor.includes('juniper')) type = 'router';
            else if (device.open_ports?.includes('80') || device.open_ports?.includes('443')) type = 'server';
            else if (vendor.includes('hp') || vendor.includes('canon')) type = 'printer';
            else type = 'workstation';

            updatedNodes.push({
                id: device.id,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                type,
                status: device.status === 'online' ? 'online' : 'offline',
                label: device.hostname || device.ip_address || 'Unknown'
            });

            // Connect all to gateway for star topology (simplified)
            updatedLinks.push({
                source: 'gateway',
                target: device.id
            });
        });

        setNodes(updatedNodes);
        setLinks(updatedLinks);
    }, [devices]);

    // Draw canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Apply transform
        ctx.save();
        ctx.translate(transform.x, transform.y);
        ctx.scale(transform.k, transform.k);

        // Draw links
        links.forEach(link => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (source && target) {
                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.strokeStyle = '#334155'; // slate-700
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        });

        // Draw nodes
        nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI);

            // Fill based on status
            if (node.status === 'online') ctx.fillStyle = '#10b981'; // emerald-500
            else if (node.status === 'warning') ctx.fillStyle = '#f59e0b'; // amber-500
            else ctx.fillStyle = '#64748b'; // slate-500

            ctx.fill();

            // Stroke
            ctx.strokeStyle = '#0f172a'; // slate-900
            ctx.lineWidth = 3;
            ctx.stroke();

            // Icon (simplified as letter)
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const icon = node.type === 'router' ? 'R' : node.type === 'server' ? 'S' : node.type === 'printer' ? 'P' : 'W';
            ctx.fillText(icon, node.x, node.y);

            // Label
            ctx.fillStyle = '#94a3b8'; // slate-400
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(node.label.substring(0, 15), node.x, node.y + 30);
        });

        ctx.restore();
    }, [nodes, links, transform]);

    return (
        <Card className="col-span-4 bg-slate-900/50 border-slate-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-slate-200">
                            <Network className="w-5 h-5 text-blue-500" />
                            Network Topology
                        </CardTitle>
                        <CardDescription>Live visualization of {nodes.length - 1} connected devices</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => setTransform(t => ({ ...t, k: Math.min(t.k * 1.2, 3) }))}>
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setTransform(t => ({ ...t, k: Math.max(t.k / 1.2, 0.5) }))}>
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setTransform({ x: 0, y: 0, k: 1 })}>
                            <RefreshCcw className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0 overflow-hidden relative h-[500px] bg-slate-950/50">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={500}
                    className="w-full h-full cursor-move"
                    onMouseDown={(e) => {
                        // Basic drag implementation could go here
                    }}
                />
                <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-slate-900/80 p-2 rounded border border-slate-700 text-xs text-slate-400">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Online</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Offline</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-slate-500 bg-slate-800 flex items-center justify-center text-[10px] text-white">R</div> Router</div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border border-slate-500 bg-slate-800 flex items-center justify-center text-[10px] text-white">S</div> Server</div>
                </div>
            </CardContent>
        </Card>
    );
}
