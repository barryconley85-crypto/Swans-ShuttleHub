import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListDrivers, useCreateDriver, useUpdateDriver, useDeleteDriver, useListVehicles } from '@workspace/api-client-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  employeeNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  vehicleId: z.string().optional(),
});

export default function Drivers() {
  const { data: drivers, refetch } = useListDrivers();
  const { data: vehicles } = useListVehicles();
  const create = useCreateDriver();
  const update = useUpdateDriver();
  const remove = useDeleteDriver();

  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', employeeNumber: '', phoneNumber: '', vehicleId: 'none' },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: '', employeeNumber: '', phoneNumber: '', vehicleId: 'none' });
    setOpen(true);
  };

  const openEdit = (driver: any) => {
    setEditingId(driver.id);
    form.reset({
      name: driver.name,
      employeeNumber: driver.employeeNumber || '',
      phoneNumber: driver.phoneNumber || '',
      vehicleId: driver.vehicleId ? driver.vehicleId.toString() : 'none',
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    const payload = {
      name: values.name,
      employeeNumber: values.employeeNumber || undefined,
      phoneNumber: values.phoneNumber || undefined,
      vehicleId: values.vehicleId && values.vehicleId !== 'none' ? parseInt(values.vehicleId) : undefined,
    };

    if (editingId) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast.success('Driver updated'); setOpen(false); refetch(); }
      });
    } else {
      create.mutate({ data: payload }, {
        onSuccess: () => { toast.success('Driver created'); setOpen(false); refetch(); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to deactivate/delete this driver?')) {
      remove.mutate({ id }, {
        onSuccess: () => { toast.success('Driver removed'); refetch(); }
      });
    }
  };

  const filtered = drivers?.filter(d => d.name.toLowerCase().includes(search.toLowerCase()) || d.employeeNumber?.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 h-full max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
            <p className="text-muted-foreground">Manage driver personnel and defaults.</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Driver</Button>
        </div>

        <div className="bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden h-full">
          <div className="p-4 border-b bg-muted/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-background" />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="bg-card sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Default Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.employeeNumber || '-'}</TableCell>
                    <TableCell>{driver.phoneNumber || '-'}</TableCell>
                    <TableCell>{driver.vehicleRegistration || '-'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${driver.isActive ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        {driver.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(driver)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(driver.id)}><Trash2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="employeeNumber" render={({ field }) => (
                <FormItem><FormLabel>Employee Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                <FormItem><FormLabel>Phone Number (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="vehicleId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Vehicle</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a vehicle" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {vehicles?.map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>{v.registration} {v.make ? `(${v.make})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
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
