import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Bus, CalendarDays, MapPin, ShieldAlert, Settings } from 'lucide-react';

export default function AdminOverview() {
  const adminCards = [
    { title: 'Drivers', description: 'Manage driver profiles and assignments', icon: Users, path: '/admin/drivers', color: 'text-blue-500' },
    { title: 'Vehicles', description: 'Fleet management and capacities', icon: Bus, path: '/admin/vehicles', color: 'text-indigo-500' },
    { title: 'Duties', description: 'Configure operational duties', icon: CalendarDays, path: '/admin/duties', color: 'text-violet-500' },
    { title: 'Stops', description: 'Manage locations and geofences', icon: MapPin, path: '/admin/stops', color: 'text-rose-500' },
    { title: 'Timetables', description: 'Schedule stops for duties', icon: CalendarDays, path: '/admin/timetables', color: 'text-orange-500' },
    { title: 'Users', description: 'System access and passwords', icon: Users, path: '/admin/users', color: 'text-emerald-500' },
    { title: 'Audit Log', description: 'Review system changes', icon: ShieldAlert, path: '/admin/audit-log', color: 'text-amber-500' },
    { title: 'Settings', description: 'Global system configuration', icon: Settings, path: '/admin/settings', color: 'text-slate-500' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Admin Portal</h1>
          <p className="text-muted-foreground">Configure ShuttleHub master data and settings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {adminCards.map((card) => (
            <Link key={card.path} href={card.path}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full group">
                <CardHeader>
                  <card.icon className={`w-8 h-8 mb-2 ${card.color} group-hover:scale-110 transition-transform`} />
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
