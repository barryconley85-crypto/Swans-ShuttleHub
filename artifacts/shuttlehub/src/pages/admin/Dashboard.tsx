import React from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useGetDashboardSummary, useListDutyStatuses } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Bus, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import MapComponent from '@/components/MapComponent';

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary({ query: { refetchInterval: 15000 } });
  const { data: statuses } = useListDutyStatuses({ query: { refetchInterval: 15000 } });

  return (
    <AdminLayout>
      <div className="p-6 h-full flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Live Operations</h1>
        
        {/* Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Passengers Today</p>
                <h3 className="text-2xl font-bold">{summary?.todayPassengerTotal || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Bus className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Duties</p>
                <h3 className="text-2xl font-bold">{summary?.activeDuties || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <h3 className="text-2xl font-bold">
                  {summary?.completedDepartures || 0} <span className="text-sm text-muted-foreground font-normal">/ {summary?.totalDepartures || 0}</span>
                </h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Missing Counts</p>
                <h3 className="text-2xl font-bold">{summary?.missingCount || 0}</h3>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Departures</p>
                <h3 className="text-2xl font-bold">{summary?.lateCount || 0}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map and Side Panel */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
          <div className="lg:col-span-2 rounded-xl overflow-hidden border shadow-sm bg-card relative z-0">
            <MapComponent statuses={statuses || []} />
          </div>
          
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <h2 className="font-semibold">Duty Status</h2>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {statuses?.map((status) => (
                <div key={status.dutyId} className="p-3 rounded-lg border bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{status.dutyName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      status.status === 'normal' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                      status.status === 'late' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                      status.status === 'missing' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                      'bg-gray-500/20 text-gray-700 dark:text-gray-400'
                    }`}>
                      {status.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Driver: {status.driverName || 'Unassigned'}</p>
                    <p>Vehicle: {status.vehicleRegistration || 'Unknown'}</p>
                    <p>Location: {status.currentStopName || 'In Transit'}</p>
                    <div className="flex items-center justify-between pt-2 mt-2 border-t">
                      <span className="text-xs">Progress: {status.completedDepartures}/{status.totalDepartures}</span>
                      <span className="text-xs font-semibold">Pax: {status.todayPassengerTotal}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!statuses || statuses.length === 0) && (
                <div className="text-center p-8 text-muted-foreground">
                  No active duties right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
