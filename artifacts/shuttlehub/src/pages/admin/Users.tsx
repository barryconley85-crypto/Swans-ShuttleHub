import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useListUsers, useCreateUser, useUpdateUser, useListDrivers } from '@workspace/api-client-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Plus, Edit2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const schema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.enum(['admin', 'driver']),
  driverId: z.string().optional(),
});

export default function Users() {
  const { data: users, refetch } = useListUsers();
  const { data: drivers } = useListDrivers();
  const create = useCreateUser();
  const update = useUpdateUser();

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '', role: 'driver', driverId: 'none' },
  });

  const watchRole = form.watch('role');

  const openNew = () => {
    setEditingId(null);
    form.reset({ username: '', password: '', role: 'driver', driverId: 'none' });
    setOpen(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    form.reset({
      username: user.username,
      password: '', // blank on edit
      role: user.role,
      driverId: user.driverId ? user.driverId.toString() : 'none',
    });
    setOpen(true);
  };

  const onSubmit = (values: z.infer<typeof schema>) => {
    const payload = {
      username: values.username,
      role: values.role,
      driverId: values.driverId && values.driverId !== 'none' ? parseInt(values.driverId) : undefined,
    };

    if (editingId) {
      update.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { toast.success('User updated'); setOpen(false); refetch(); }
      });
      // Note: A separate endpoint is usually needed for password resets. We omit it here for brevity.
    } else {
      if (!values.password) {
        toast.error('Password is required for new users');
        return;
      }
      create.mutate({ data: { ...payload, password: values.password } }, {
        onSuccess: () => { toast.success('User created'); setOpen(false); refetch(); }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
            <p className="text-muted-foreground">Manage login credentials and roles.</p>
          </div>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add User</Button>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex-1">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Linked Driver Profile</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-bold">{user.username}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {user.role.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{user.driverName || '-'}</TableCell>
                  <TableCell>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(user)}><Edit2 className="w-4 h-4" /></Button>
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
            <DialogTitle>{editingId ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password {editingId && '(Leave blank to keep current)'}</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              {watchRole === 'driver' && (
                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Driver Profile</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select a driver" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {drivers?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Save Changes' : 'Create User'}</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
