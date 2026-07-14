import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bus, Lock, User as UserIcon } from 'lucide-react';
import { useLogin, useListDrivers, getListDriversQueryKey, AuthSession } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { refresh } = useAuth();
  const loginMutation = useLogin();
  const { data: drivers } = useListDrivers({ query: { queryKey: getListDriversQueryKey(), retry: false } });
  
  const [driverSelectId, setDriverSelectId] = useState<string>('');
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (session: AuthSession) => {
        refresh();
        if (session.role === 'driver') {
          setLocation('/driver');
        } else {
          setLocation('/dashboard');
        }
      },
      onError: () => {
        toast.error('Login failed', { description: 'Please check your credentials.' });
      }
    });
  };

  const handleDriverLogin = () => {
    if (!driverSelectId) {
      toast.error('Select a driver first');
      return;
    }
    const driver = drivers?.find(d => d.id.toString() === driverSelectId);
    if (!driver) return;
    
    // Derive username: "John Smith" → "john.smith"
    const username = driver.name.toLowerCase().replace(/\s+/g, '.');
    form.setValue('username', username);
    form.setValue('password', 'driver123');
    form.handleSubmit(onSubmit)();
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[100px]" />
      </div>

      <Card className="w-full max-w-md shadow-xl border-primary/20 backdrop-blur-sm bg-card/95 z-10">
        <CardHeader className="text-center space-y-4 pb-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
            <Bus className="w-8 h-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Swans ShuttleHub</CardTitle>
            <CardDescription className="text-base mt-2">Operations Command Centre</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Enter username" className="pl-10 h-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="password-input" type="password" placeholder="Enter password" className="pl-10 h-12" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-12 text-lg font-medium mt-2" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Authenticating...' : 'Login'}
              </Button>
            </form>
          </Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Driver Quick Login</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Select value={driverSelectId} onValueChange={setDriverSelectId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select your name" />
              </SelectTrigger>
              <SelectContent>
                {drivers?.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="secondary" className="h-12 px-6" onClick={handleDriverLogin}>
              Select
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
