import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { useLogout } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Map,
  BarChart3,
  Users,
  Bus,
  MapPin,
  CalendarDays,
  Settings,
  ShieldAlert,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        refresh();
        setLocation('/login');
      }
    });
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Live Map', path: '/dashboard', icon: Map, exact: true },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const adminItems = [
    { label: 'Admin Home', path: '/admin', icon: Settings, exact: true },
    { label: 'Drivers', path: '/admin/drivers', icon: UserIcon },
    { label: 'Vehicles', path: '/admin/vehicles', icon: Bus },
    { label: 'Duties', path: '/admin/duties', icon: CalendarDays },
    { label: 'Stops & Geofences', path: '/admin/stops', icon: MapPin },
    { label: 'Timetables', path: '/admin/timetables', icon: CalendarDays },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Audit Log', path: '/admin/audit-log', icon: ShieldAlert },
    { label: 'System Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Sidebar - Desktop */}
      <aside className="w-64 border-r bg-card flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Bus className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">Swans ShuttleHub</span>
        </div>
        
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Operations
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const active = item.exact ? location === item.path : location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          
          <div className="px-1 pt-6 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Management
          </div>
          {adminItems.map((item) => {
            const active = item.exact ? location === item.path : location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t mt-auto">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.username}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b flex items-center justify-between px-4 bg-card shrink-0">
          <div className="flex items-center gap-2">
            <Bus className="w-6 h-6 text-primary" />
            <span className="font-bold">ShuttleHub</span>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-muted/20">
          {children}
        </div>
      </main>
    </div>
  );
}
