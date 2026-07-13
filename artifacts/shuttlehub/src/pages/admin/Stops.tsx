import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListStops, useCreateStop, useUpdateStop, useDeleteStop } from '@workspace/api-client-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  geofenceRadiusMeters: z.coerce.number().min(10, 'Minimum radius 10m'),
});

export default function Stops() {
  const { data: stops, refetch } = useListStops();
  const create = useCreateStop();
  const update = useUpdateStop();
  const remove = useDeleteStop();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', latitude: undefined, longitude: undefined, geofenceRadiusMeters: 50 },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: '', latitude: undefined, longitude: undefined, geofenceRadiusMeters: 50 });
    setOpen(true);
  };

  const openEdit = (stop: any) => {
    setEditingId(stop.id);
    form.reset({
      name: stop.name,
      latitude: stop.latitude || undefined,
      longitude: stop.longitude || undefined,
      geofenceRadiusMeters: stop.geofenceRadiusMeters || 50,
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (editingId) {
      update.mutate({ id: editingId, data: values }, {
        onSuccess: () => { toast.success('Stop updated'); setOpen(false); refetch(); }
      });
    } else {
      create.mutate({ data: values }, {
        onSuccess: () => { toast.success('Stop created'); setOpen(false); refetch(); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to deactivate/delete this stop?')) {
      remove.mutate({ id }, {
        onSuccess: () => { toast.success('Stop removed'); refetch(); }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Stops & Geofences</h1>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Stop</Button>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex-1">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Coordinates</TableHead>
                <TableHead>Geofence Radius</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stops?.map((stop) => (
                <TableRow key={stop.id}>
                  <TableCell className="font-medium">{stop.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {stop.latitude && stop.longitude ? `${stop.latitude}, ${stop.longitude}` : 'Not set'}
                  </TableCell>
                  <TableCell>{stop.geofenceRadiusMeters} m</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(stop)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(stop.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Stop' : 'Add Stop'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Stop Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem><FormLabel>Latitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem><FormLabel>Longitude</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="geofenceRadiusMeters" render={({ field }) => (
                <FormItem><FormLabel>Geofence Radius (meters)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Create'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
