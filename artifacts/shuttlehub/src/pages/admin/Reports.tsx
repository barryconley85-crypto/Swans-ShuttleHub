import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Loader2, CheckCircle2, XCircle, Coffee } from 'lucide-react';
import {
  useGetDailyReport,
  useGetMissingSubmissions,
  useGetLateSubmissions
} from '@workspace/api-client-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { customFetch } from '@workspace/api-client-react';

// Inline hook for duty loadings (not yet in generated client)
function useDutyLoadings(date: string) {
  const [data, setData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  React.useEffect(() => {
    setIsLoading(true);
    customFetch(`/api/reports/duty-loadings?date=${date}`)
      .then(r => r.json())
      .then(d => { setData(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [date]);
  return { data, isLoading };
}

export default function Reports() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: dailyReport, isLoading: loadingDaily } = useGetDailyReport({ date });
  const { data: missingRecords } = useGetMissingSubmissions({ date });
  const { data: lateRecords } = useGetLateSubmissions({ date });
  const { data: loadings, isLoading: loadingLoadings } = useDutyLoadings(date);

  const exportCSV = () => {
    if (!loadings?.duties) return;
    const rows: string[][] = [['Duty', 'Driver', 'Run', 'Seq', 'Time', 'Stop', 'Passengers', 'Status']];
    for (const duty of loadings.duties) {
      for (const stop of duty.stops) {
        rows.push([
          duty.dutyName,
          duty.driverName ?? '',
          stop.runNumber ?? 1,
          stop.sequenceOrder,
          stop.scheduledTime,
          stop.stopName,
          stop.passengerCount ?? '',
          stop.recorded ? (stop.isLate ? `Late +${stop.minutesLate}m` : 'On time') : 'Missing',
        ]);
      }
    }
    const csv = "data:text/csv;charset=utf-8," + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `loadings-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 flex flex-col gap-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports &amp; Analytics</h1>
            <p className="text-muted-foreground text-sm">Historical data and compliance tracking.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 sm:w-auto"
            />
            <Button onClick={exportCSV} variant="outline" className="gap-2 shrink-0">
              <Download className="w-4 h-4" /> CSV
            </Button>
          </div>
        </div>

        <Tabs defaultValue="loadings" className="w-full">
          <TabsList className="w-full sm:w-auto grid grid-cols-4">
            <TabsTrigger value="loadings">Loadings</TabsTrigger>
            <TabsTrigger value="daily">Summary</TabsTrigger>
            <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
            <TabsTrigger value="hourly">By Hour</TabsTrigger>
          </TabsList>

          {/* ── DUTY LOADINGS TAB ── */}
          <TabsContent value="loadings" className="mt-6 space-y-6">
            {loadingLoadings ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : loadings?.duties?.length > 0 ? (
              loadings.duties.map((duty: any) => {
                if (duty.stops.length === 0) return null;
                // Group stops by run number
                const runs: Record<number, any[]> = {};
                for (const stop of duty.stops) {
                  const run = stop.runNumber ?? 1;
                  if (!runs[run]) runs[run] = [];
                  runs[run].push(stop);
                }
                const runNumbers = Object.keys(runs).map(Number).sort((a, b) => a - b);
                const totalRuns = runNumbers.length;

                return (
                  <Card key={duty.dutyId} className="overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/30 border-b">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <CardTitle className="text-lg">Duty {duty.dutyNumber} — {duty.dutyName}</CardTitle>
                          <CardDescription>
                            {duty.driverName ? `Driver: ${duty.driverName}` : 'No driver recorded'}
                            {totalRuns > 1 && ` · ${totalRuns} runs`}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-bold text-2xl">{duty.totalPassengers}</span>
                          <span className="text-muted-foreground">passengers</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            duty.completed === duty.total
                              ? 'bg-green-500/20 text-green-600'
                              : duty.completed === 0
                              ? 'bg-red-500/20 text-red-600'
                              : 'bg-amber-500/20 text-amber-600'
                          }`}>
                            {duty.completed}/{duty.total} stops
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {runNumbers.map((runNum, runIdx) => (
                        <div key={runNum}>
                          {totalRuns > 1 && (
                            <div className="px-4 py-2 bg-muted/20 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Run {runNum}
                            </div>
                          )}
                          <div className="divide-y">
                            {runs[runNum].map((stop: any) => (
                              <div key={stop.timetableEntryId} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${!stop.recorded ? 'bg-red-500/5' : ''}`}>
                                <span className="font-mono w-12 text-muted-foreground shrink-0">{stop.scheduledTime}</span>
                                <span className="flex-1 truncate">{stop.stopName}</span>
                                <span className={`font-bold w-8 text-right ${stop.recorded ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {stop.recorded ? stop.passengerCount : '—'}
                                </span>
                                <span className="w-6 flex justify-center shrink-0">
                                  {stop.recorded ? (
                                    stop.isLate
                                      ? <span className="text-amber-500 text-xs font-medium">+{stop.minutesLate}m</span>
                                      : <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          {/* Break indicator */}
                          {runs[runNum][runs[runNum].length - 1]?.isBreakAfter === 1 && runIdx < runNumbers.length - 1 && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-950/30 border-y text-amber-400 text-xs font-medium">
                              <Coffee className="w-3.5 h-3.5" /> Driver break
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="text-center p-12 text-muted-foreground border border-dashed rounded-xl">
                No passenger records for {date}. Records appear here once drivers submit departures.
              </div>
            )}
          </TabsContent>

          {/* ── SUMMARY TAB ── */}
          <TabsContent value="daily" className="mt-6 space-y-6">
            {loadingDaily ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : dailyReport ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card><CardHeader className="pb-2"><CardDescription>Total Passengers</CardDescription><CardTitle className="text-3xl">{dailyReport.totalPassengers}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Completed Departures</CardDescription><CardTitle className="text-3xl">{dailyReport.completedDepartures} / {dailyReport.totalDepartures}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Avg Passengers/Trip</CardDescription><CardTitle className="text-3xl">{dailyReport.averagePassengers?.toFixed(1) || 0}</CardTitle></CardHeader></Card>
                  <Card><CardHeader className="pb-2"><CardDescription>Compliance Rate</CardDescription><CardTitle className="text-3xl">{dailyReport.totalDepartures > 0 ? Math.round((dailyReport.completedDepartures / dailyReport.totalDepartures) * 100) : 0}%</CardTitle></CardHeader></Card>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle>Passengers by Duty</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyReport.byDuty}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="dutyName" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          <Bar dataKey="totalPassengers" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle>Top Stops by Volume</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyReport.byStop.slice(0, 5)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="stopName" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                          <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
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

          {/* ── EXCEPTIONS TAB ── */}
          <TabsContent value="exceptions" className="mt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-red-500">Missing Submissions ({missingRecords?.length || 0})</CardTitle>
                  <CardDescription>Departures that passed their scheduled time without a passenger count.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {missingRecords?.map(m => (
                      <div key={m.timetableEntryId} className="flex flex-col p-3 border rounded-lg bg-red-500/5">
                        <div className="flex justify-between font-medium text-sm">
                          <span>{m.dutyName} — {m.scheduledTime}</span>
                          <span className="text-red-500">MISSING</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.stopName}</span>
                      </div>
                    ))}
                    {(!missingRecords || missingRecords.length === 0) && <p className="text-sm text-muted-foreground">No missing submissions.</p>}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="text-amber-500">Late Submissions ({lateRecords?.length || 0})</CardTitle>
                  <CardDescription>Departures recorded more than 5 minutes after scheduled time.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lateRecords?.map(l => (
                      <div key={l.id} className="flex flex-col p-3 border rounded-lg bg-amber-500/5">
                        <div className="flex justify-between font-medium text-sm">
                          <span>{l.dutyName} — {l.scheduledTime}</span>
                          <span className="text-amber-500">+{l.minutesLate} mins</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{l.stopName}</span>
                          <span>Actual: {new Date(l.actualSubmissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Driver: {l.driverName || 'Unknown'} · Pax: {l.passengerCount}</span>
                      </div>
                    ))}
                    {(!lateRecords || lateRecords.length === 0) && <p className="text-sm text-muted-foreground">No late submissions.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── BY HOUR TAB ── */}
          <TabsContent value="hourly" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Passenger Volume by Hour</CardTitle></CardHeader>
              <CardContent className="h-[400px]">
                {dailyReport?.byHour && dailyReport.byHour.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyReport.byHour}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}:00`} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip cursor={{ stroke: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} labelFormatter={(v) => `${v}:00–${v}:59`} />
                      <Line type="monotone" dataKey="totalPassengers" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
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
