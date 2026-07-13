import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListVehicles, useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@workspace/api-client-react';
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
  registration: z.string().min(1, 'Registration required'),
  make: z.string().optional(),
  model: z.string().optional(),
  capacity: z.coerce.number().optional(),
});

export default function Vehicles() {
  const { data: vehicles, refetch } = useListVehicles();
  const create = useCreateVehicle();
  const update = useUpdateVehicle();
  const remove = useDeleteVehicle();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { registration: '', make: '', model: '', capacity: undefined },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ registration: '', make: '', model: '', capacity: undefined });
    setOpen(true);
  };

  const openEdit = (vehicle: any) => {
    setEditingId(vehicle.id);
    form.reset({
      registration: vehicle.registration,
      make: vehicle.make || '',
      model: vehicle.model || '',
      capacity: vehicle.capacity || undefined,
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (editingId) {
      update.mutate({ id: editingId, data: values }, {
        onSuccess: () => { toast.success('Vehicle updated'); setOpen(false); refetch(); }
      });
    } else {
      create.mutate({ data: values }, {
        onSuccess: () => { toast.success('Vehicle created'); setOpen(false); refetch(); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to deactivate/delete this vehicle?')) {
      remove.mutate({ id }, {
        onSuccess: () => { toast.success('Vehicle removed'); refetch(); }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Vehicle</Button>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex-1">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Make</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles?.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-bold font-mono">{vehicle.registration}</TableCell>
                  <TableCell>{vehicle.make || '-'}</TableCell>
                  <TableCell>{vehicle.model || '-'}</TableCell>
                  <TableCell>{vehicle.capacity || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${vehicle.isActive ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {vehicle.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(vehicle)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(vehicle.id)}><Trash2 className="w-4 h-4" /></Button>
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
            <DialogTitle>{editingId ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="registration" render={({ field }) => (
                <FormItem><FormLabel>Registration Plate</FormLabel><FormControl><Input className="uppercase font-mono font-bold" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="make" render={({ field }) => (
                <FormItem><FormLabel>Make (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="model" render={({ field }) => (
                <FormItem><FormLabel>Model (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="capacity" render={({ field }) => (
                <FormItem><FormLabel>Seating Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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
