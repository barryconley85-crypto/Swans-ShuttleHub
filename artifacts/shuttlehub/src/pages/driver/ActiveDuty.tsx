import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import {
  useGetDuty,
  useListTimetables,
  useListStops,
  useCreatePassengerRecord,
  useListPassengerRecords
} from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useGps } from '@/contexts/gps-context';
import { useOffline } from '@/contexts/offline-context';
import { Button } from '@/components/ui/button';
import { Loader2, Navigation, WifiOff, MapPin, Coffee, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ActiveDuty() {
  const [match, params] = useRoute('/driver/duty/:dutyId');
  const dutyId = match ? parseInt(params.dutyId, 10) : 0;
  const [, setLocation] = useLocation();

  const { user } = useAuth();
  const { startTracking, stopTracking, lastPosition } = useGps();
  const { isOnline, queuePassengerRecord } = useOffline();

  const { data: duty } = useGetDuty(dutyId, { query: { enabled: !!dutyId } });
  const { data: timetables } = useListTimetables({ dutyId }, { query: { enabled: !!dutyId } });
  const { data: stops } = useListStops();
  const today = new Date().toISOString().split('T')[0];
  const { data: existingRecords, refetch: refetchRecords } = useListPassengerRecords(
    { dutyId, date: today, driverId: user?.driverId ?? undefined },
    { query: { enabled: !!dutyId } }
  );

  const createRecord = useCreatePassengerRecord();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [showBreak, setShowBreak] = useState(false);

  useEffect(() => {
    if (dutyId) startTracking(dutyId);
    return () => stopTracking();
  }, [dutyId]);

  const sortedTimetables = timetables ? [...timetables].sort((a, b) => a.sequenceOrder - b.sequenceOrder) : [];

  // Auto-advance to first unrecorded stop
  useEffect(() => {
    if (timetables && existingRecords && sortedTimetables.length > 0) {
      const idx = sortedTimetables.findIndex(t => !existingRecords.some(r => r.timetableEntryId === t.id));
      if (idx === -1) {
        setLocation('/driver/complete');
      } else {
        setCurrentIndex(idx);
      }
    }
  }, [timetables, existingRecords]);

  const currentEntry = sortedTimetables[currentIndex];

  // Geofence
  const [inGeofence, setInGeofence] = useState(false);
  useEffect(() => {
    if (currentEntry && lastPosition && stops) {
      const stop = stops.find(s => s.id === currentEntry.stopId);
      if (stop?.latitude && stop?.longitude) {
        const dist = getDistance(lastPosition.coords.latitude, lastPosition.coords.longitude, stop.latitude, stop.longitude);
        setInGeofence(dist <= (stop.geofenceRadiusMeters || 100));
      }
    }
  }, [currentEntry, lastPosition, stops]);

  const handleSubmit = () => {
    if (!currentEntry) return;
    if (existingRecords?.some(r => r.timetableEntryId === currentEntry.id)) {
      toast.error('This departure has already been recorded.');
      return;
    }

    const payload = {
      driverId: user?.driverId ?? 1,
      dutyId,
      stopId: currentEntry.stopId,
      timetableEntryId: currentEntry.id,
      passengerCount: count,
      latitude: lastPosition?.coords.latitude,
      longitude: lastPosition?.coords.longitude,
    };

    const afterSubmit = () => {
      setCount(0);
      refetchRecords();
      // Check if break follows this stop
      const hasBreakAfter = (currentEntry as any).isBreakAfter === 1 || (currentEntry as any).isBreakAfter === true;
      if (hasBreakAfter) {
        setShowBreak(true);
      } else if (currentIndex < sortedTimetables.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setLocation('/driver/complete');
      }
    };

    if (isOnline) {
      createRecord.mutate({ data: payload }, {
        onSuccess: () => { toast.success('Recorded'); afterSubmit(); },
        onError: () => { toast.error('Failed — saved offline'); queuePassengerRecord(payload); afterSubmit(); }
      });
    } else {
      queuePassengerRecord(payload);
      toast.success('Saved offline');
      afterSubmit();
    }
  };

  const resumeAfterBreak = () => {
    setShowBreak(false);
    if (currentIndex < sortedTimetables.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setLocation('/driver/complete');
    }
  };

  // Loading
  if (!timetables) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // No stops configured
  if (sortedTimetables.length === 0) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6 p-8 text-center">
        <MapPin className="w-16 h-16 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-bold mb-2">No stops scheduled</h2>
          <p className="text-muted-foreground">This duty has no timetable entries set up yet. Contact your administrator.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation('/driver')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Duties
        </Button>
      </div>
    );
  }

  // Break screen
  if (showBreak) {
    const nextEntry = sortedTimetables[currentIndex + 1];
    return (
      <div className="min-h-[100dvh] bg-amber-950 flex flex-col items-center justify-center text-amber-100 p-8 text-center gap-6">
        <Coffee className="w-24 h-24 opacity-80" />
        <div>
          <h1 className="text-4xl font-bold mb-3">Driver Break</h1>
          <p className="text-xl opacity-80">Take your scheduled rest break.</p>
          {nextEntry && (
            <p className="mt-4 text-lg opacity-70">
              Next run starts at <span className="font-bold">{nextEntry.scheduledTime}</span>
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="w-full max-w-sm h-16 text-xl font-bold rounded-2xl bg-amber-500 hover:bg-amber-400 text-amber-950 mt-4"
          onClick={resumeAfterBreak}
        >
          Start Next Run
        </Button>
        <Button variant="ghost" className="text-amber-200/60" onClick={() => setLocation('/driver')}>
          Exit Duty
        </Button>
      </div>
    );
  }

  if (!currentEntry) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const currentRun = (currentEntry as any).runNumber ?? 1;
  const totalRuns = Math.max(...sortedTimetables.map((t: any) => t.runNumber ?? 1));
  const runStops = sortedTimetables.filter((t: any) => (t.runNumber ?? 1) === currentRun);
  const stopInRun = runStops.findIndex(t => t.id === currentEntry.id) + 1;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-safe">
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> Offline Mode — will sync when connected
        </div>
      )}

      <header className="px-4 py-3 flex items-center justify-between border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/driver')} className="-ml-2">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-lg font-bold leading-tight">{duty?.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {lastPosition ? <Navigation className="w-3 h-3 text-green-500" /> : <Loader2 className="w-3 h-3 animate-spin" />}
              GPS {lastPosition ? 'Active' : 'Searching…'}
              {totalRuns > 1 && <span className="ml-2 text-primary font-semibold">Run {currentRun}/{totalRuns}</span>}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div className="font-semibold text-foreground text-sm">{stopInRun}/{runStops.length}</div>
          <div>stops</div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${((existingRecords?.length ?? 0) / sortedTimetables.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-4">
        {/* Stop card */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Stop {currentIndex + 1} of {sortedTimetables.length}
            </span>
            <span className="text-2xl font-mono font-bold">{currentEntry.scheduledTime}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-3 pr-8">{currentEntry.stopName ?? 'Unknown stop'}</h2>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-colors ${inGeofence ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {inGeofence ? '✓ At stop location' : 'Not at stop location'}
            </span>
          </div>
        </div>

        {/* Counter */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-widest">Passengers Boarding</span>
          <div className="flex items-center justify-center gap-6 w-full px-4">
            <button
              onClick={() => setCount(prev => Math.max(0, prev - 1))}
              className="w-20 h-24 rounded-2xl bg-muted text-4xl font-bold flex items-center justify-center active:scale-95 transition-all border hover:border-border shadow-sm"
            >
              −
            </button>
            <div className="w-32 h-32 rounded-3xl bg-card border-2 border-primary/30 flex items-center justify-center text-6xl font-bold shadow-inner">
              {count}
            </div>
            <button
              onClick={() => setCount(prev => prev + 1)}
              className="w-20 h-24 rounded-2xl bg-primary text-primary-foreground text-4xl font-bold flex items-center justify-center active:scale-95 transition-all shadow-md"
            >
              +
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-6">
          <Button
            className="w-full h-20 text-2xl font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-transform"
            onClick={handleSubmit}
            disabled={createRecord.isPending}
          >
            {createRecord.isPending ? <Loader2 className="w-8 h-8 animate-spin" /> : 'Submit Departure'}
          </Button>
        </div>
      </div>
    </div>
  );
}
