import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2 } from 'lucide-react';
import { 
  useGetDailyReport,
  useGetMissingSubmissions,
  useGetLateSubmissions 
} from '@workspace/api-client-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const { data: dailyReport, isLoading: loadingDaily } = useGetDailyReport({ date });
  const { data: missingRecords } = useGetMissingSubmissions({ date });
  const { data: lateRecords } = useGetLateSubmissions({ date });

  const exportCSV = () => {
    if (!dailyReport) return;
    const rows = [
      ['Date', 'Total Passengers', 'Total Departures', 'Completed', 'Missing', 'Late'],
      [
        dailyReport.date, 
        dailyReport.totalPassengers, 
        dailyReport.totalDepartures, 
        dailyReport.completedDepartures, 
        dailyReport.missingDepartures, 
        dailyReport.lateDepartures
      ]
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shuttlehub-report-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="p-6 flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">Historical data and compliance tracking.</p>
          </div>
          <div className="flex items-center gap-3">
            <Input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger value="hourly">By Hour</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-6 space-y-6">
            {loadingDaily ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : dailyReport ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Passengers</CardDescription>
                      <CardTitle className="text-3xl">{dailyReport.totalPassengers}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Completed Departures</CardDescription>
                      <CardTitle className="text-3xl">{dailyReport.completedDepartures} / {dailyReport.totalDepartures}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Avg Passengers/Trip</CardDescription>
                      <CardTitle className="text-3xl">{dailyReport.averagePassengers?.toFixed(1) || 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Compliance Rate</CardDescription>
                      <CardTitle className="text-3xl">
                        {dailyReport.totalDepartures > 0 
                          ? Math.round((dailyReport.completedDepartures / dailyReport.totalDepartures) * 100) 
                          : 0}%
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Passengers by Duty</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyReport.byDuty}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="dutyName" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} />
                          <Bar dataKey="totalPassengers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Stops by Volume</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyReport.byStop.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="stopName" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                          <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} />
                          <Bar dataKey="totalPassengers" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-muted-foreground">No data available for this date.</div>
            )}
          </TabsContent>
          
          <TabsContent value="exceptions" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-500">Missing Submissions ({missingRecords?.length || 0})</CardTitle>
                  <CardDescription>Departures that passed their scheduled time without a passenger count.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {missingRecords?.map(m => (
                      <div key={m.timetableEntryId} className="flex flex-col p-3 border rounded-lg bg-red-500/5">
                        <div className="flex justify-between font-medium">
                          <span>{m.dutyName} - {m.scheduledTime}</span>
                          <span className="text-red-500">MISSING</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{m.stopName}</span>
                        <span className="text-xs text-muted-foreground mt-1">Driver: {m.driverName || 'Unknown'}</span>
                      </div>
                    ))}
                    {(!missingRecords || missingRecords.length === 0) && (
                      <p className="text-sm text-muted-foreground">No missing submissions.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-amber-500">Late Submissions ({lateRecords?.length || 0})</CardTitle>
                  <CardDescription>Departures recorded more than 5 minutes after scheduled time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lateRecords?.map(l => (
                      <div key={l.id} className="flex flex-col p-3 border rounded-lg bg-amber-500/5">
                        <div className="flex justify-between font-medium">
                          <span>{l.dutyName} - {l.scheduledTime}</span>
                          <span className="text-amber-500">+{l.minutesLate} mins</span>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{l.stopName}</span>
                          <span>Actual: {new Date(l.actualSubmissionTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Driver: {l.driverName || 'Unknown'} | Pax: {l.passengerCount}</span>
                      </div>
                    ))}
                    {(!lateRecords || lateRecords.length === 0) && (
                      <p className="text-sm text-muted-foreground">No late submissions.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="hourly" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Passenger Volume by Hour</CardTitle>
              </CardHeader>
              <CardContent className="h-[400px]">
                {dailyReport?.byHour && dailyReport.byHour.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyReport.byHour}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}:00`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{stroke: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px'}} labelFormatter={(val) => `${val}:00 - ${val}:59`} />
                      <Line type="monotone" dataKey="totalPassengers" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4, fill: 'hsl(var(--primary))'}} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No hourly data available.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
