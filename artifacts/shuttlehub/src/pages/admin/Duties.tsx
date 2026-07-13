import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListDuties, useCreateDuty, useUpdateDuty, useDeleteDuty } from '@workspace/api-client-react';
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
  number: z.coerce.number().min(1, 'Number must be > 0'),
  description: z.string().optional(),
});

export default function Duties() {
  const { data: duties, refetch } = useListDuties();
  const create = useCreateDuty();
  const update = useUpdateDuty();
  const remove = useDeleteDuty();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', number: 1, description: '' },
  });

  const openNew = () => {
    setEditingId(null);
    form.reset({ name: '', number: (duties?.length || 0) + 1, description: '' });
    setOpen(true);
  };

  const openEdit = (duty: any) => {
    setEditingId(duty.id);
    form.reset({
      name: duty.name,
      number: duty.number,
      description: duty.description || '',
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    if (editingId) {
      update.mutate({ id: editingId, data: values }, {
        onSuccess: () => { toast.success('Duty updated'); setOpen(false); refetch(); }
      });
    } else {
      create.mutate({ data: values }, {
        onSuccess: () => { toast.success('Duty created'); setOpen(false); refetch(); }
      });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to deactivate/delete this duty?')) {
      remove.mutate({ id }, {
        onSuccess: () => { toast.success('Duty removed'); refetch(); }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Duties</h1>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add Duty</Button>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex-1">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duties?.map((duty) => (
                <TableRow key={duty.id}>
                  <TableCell className="font-bold">{duty.number}</TableCell>
                  <TableCell>{duty.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-md truncate">{duty.description || '-'}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${duty.isActive ? 'bg-green-500/20 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                      {duty.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(duty)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(duty.id)}><Trash2 className="w-4 h-4" /></Button>
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
            <DialogTitle>{editingId ? 'Edit Duty' : 'Add Duty'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="number" render={({ field }) => (
                <FormItem><FormLabel>Duty Number</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Duty Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
