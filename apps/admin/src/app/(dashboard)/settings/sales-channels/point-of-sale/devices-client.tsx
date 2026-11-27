"use client";

import * as React from "react";
import { Monitor, Plus, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@zerocraft/ui/badge";
import { Button } from "@zerocraft/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@zerocraft/ui/card";
import { Input } from "@zerocraft/ui/input";
import { toast } from "@zerocraft/ui/toast";
import { registerPosDevice } from "./actions";

type Device = { id: string; name: string; device_type: string; status: string; last_seen_at: string | null; registered_at: string; location_id: string | null };
type Location = { id: string; name: string; code: string };

export function DevicesClient({ devices, locations, canManage }: { devices: Device[]; locations: Location[]; canManage: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [deviceType, setDeviceType] = React.useState("tablet");
  const [busy, setBusy] = React.useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    const result = await registerPosDevice({ name, locationId: locationId || null, deviceType });
    setBusy(false);
    if (!result.ok) { toast.add({ title: result.error, type: "error" }); return; }
    toast.add({ title: "POS device registered.", type: "success" }); window.location.reload();
  };
  const locationName = (id: string | null) => locations.find((location) => location.id === id)?.name ?? "All locations";
  return <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Devices</h1><p className="mt-1 text-sm text-muted-foreground">Manage POS devices registered to your store.</p></div>{canManage && <Button onClick={() => setOpen((value) => !value)}><Plus className="mr-2 size-4" />Register device</Button>}</div>
    {open && <Card><CardHeader><CardTitle>Register a device</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-3"><Input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} placeholder="Device name" /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={deviceType} onChange={(event) => setDeviceType(event.target.value)}><option value="tablet">Tablet</option><option value="phone">Phone</option><option value="terminal">Terminal</option></select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">All locations</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select><div className="sm:col-span-3 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? "Registering…" : "Register device"}</Button></div></form></CardContent></Card>}
    <Card><CardHeader><CardTitle>Registered devices</CardTitle></CardHeader><CardContent><div className="divide-y rounded-lg border">{devices.map((device) => <div key={device.id} className="flex items-center justify-between gap-4 p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-muted"><Monitor className="size-5" /></div><div><p className="font-medium">{device.name}</p><p className="text-sm text-muted-foreground">{locationName(device.location_id)} · {device.device_type}</p></div></div><div className="flex items-center gap-3"><Badge variant={device.status === "online" ? "success" : "default"}>{device.status === "online" ? <><Wifi className="mr-1 size-3" />Online</> : <><WifiOff className="mr-1 size-3" />{device.status === "deactivated" ? "Deactivated" : "Offline"}</>}</Badge><span className="hidden text-xs text-muted-foreground sm:inline">Registered {new Date(device.registered_at).toLocaleDateString()}</span></div></div>)}{devices.length === 0 && <div className="p-12 text-center text-sm text-muted-foreground">No devices registered yet.</div>}</div></CardContent></Card>
  </div>;
}
