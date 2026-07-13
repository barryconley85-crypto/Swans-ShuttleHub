import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, Navigation, WifiOff, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
import { toast } from 'sonner';

// Haversine formula for geofence check
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
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
    { dutyId, date: today, driverId: user?.driverId || undefined },
    { query: { enabled: !!dutyId } }
  );

  const createRecord = useCreatePassengerRecord();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [count, setCount] = useState(0);

  // Initialize tracking
  useEffect(() => {
    if (dutyId) startTracking(dutyId);
    return () => stopTracking();
  }, [dutyId]);

  // Find next unrecorded entry on load
  useEffect(() => {
    if (timetables && existingRecords && timetables.length > 0) {
      const sortedTimetables = [...timetables].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      const unrecordedIndex = sortedTimetables.findIndex(t => 
        !existingRecords.some(r => r.timetableEntryId === t.id)
      );
      if (unrecordedIndex !== -1) {
        setCurrentIndex(unrecordedIndex);
      } else {
        // All done!
        setLocation('/driver/complete');
      }
    }
  }, [timetables, existingRecords, setLocation]);

  const sortedTimetables = timetables ? [...timetables].sort((a, b) => a.sequenceOrder - b.sequenceOrder) : [];
  const currentEntry = sortedTimetables[currentIndex];
  
  // Geofence check
  const [inGeofence, setInGeofence] = useState(false);
  useEffect(() => {
    if (currentEntry && lastPosition && stops) {
      const stop = stops.find(s => s.id === currentEntry.stopId);
      if (stop && stop.latitude && stop.longitude) {
        const dist = getDistance(
          lastPosition.coords.latitude, 
          lastPosition.coords.longitude,
          stop.latitude,
          stop.longitude
        );
        setInGeofence(dist <= (stop.geofenceRadiusMeters || 50));
      }
    }
  }, [currentEntry, lastPosition, stops]);

  const handleIncrement = () => setCount(prev => prev + 1);
  const handleDecrement = () => setCount(prev => Math.max(0, prev - 1));

  const handleSubmit = () => {
    if (!currentEntry) return;
    
    if (existingRecords?.some(r => r.timetableEntryId === currentEntry.id)) {
      toast.error('This departure has already been recorded.');
      return;
    }

    const payload = {
      driverId: user?.driverId || 1, // fallback to 1 if not linked
      dutyId,
      stopId: currentEntry.stopId,
      timetableEntryId: currentEntry.id,
      passengerCount: count,
      latitude: lastPosition?.coords.latitude,
      longitude: lastPosition?.coords.longitude,
    };

    if (isOnline) {
      createRecord.mutate({ data: payload }, {
        onSuccess: () => {
          toast.success('Recorded successfully');
          advance();
        },
        onError: () => {
          toast.error('Failed to submit. Queuing offline.');
          queuePassengerRecord(payload);
          advance();
        }
      });
    } else {
      queuePassengerRecord(payload);
      toast.success('Saved offline');
      advance();
    }
  };

  const advance = () => {
    setCount(0);
    refetchRecords();
    if (currentIndex < sortedTimetables.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setLocation('/driver/complete');
    }
  };

  const timetablesLoaded = timetables !== undefined;
  const noStops = timetablesLoaded && sortedTimetables.length === 0;

  if (!timetablesLoaded) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (noStops) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-background gap-6 p-8 text-center">
        <MapPin className="w-16 h-16 text-muted-foreground" />
        <div>
          <h2 className="text-2xl font-bold mb-2">No stops scheduled</h2>
          <p className="text-muted-foreground">This duty has no timetable entries set up yet. Contact your administrator.</p>
        </div>
        <Button variant="outline" onClick={() => setLocation('/driver')}>Back to Duties</Button>
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

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-safe">
      {!isOnline && (
        <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          Offline Mode - Records will sync when connected
        </div>
      )}

      <header className="px-4 py-4 flex items-center justify-between border-b bg-card shrink-0">
        <div>
          <h1 className="text-xl font-bold">{duty?.name}</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1">
            {lastPosition ? <Navigation className="w-3 h-3 text-primary" /> : <Loader2 className="w-3 h-3 animate-spin" />}
            GPS {lastPosition ? 'Active' : 'Searching...'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setLocation('/driver')}>
          Exit Duty
        </Button>
      </header>

      <div className="flex-1 flex flex-col p-4">
        {/* Stop Info */}
        <div className="bg-card rounded-2xl p-6 shadow-sm border mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-primary">Stop {currentIndex + 1} of {sortedTimetables.length}</span>
            <span className="text-xl font-mono font-bold">{currentEntry.scheduledTime}</span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 pr-8">{currentEntry.stopName}</h2>
          
          <div className="flex items-center gap-2 mt-4">
            <div className={`w-3 h-3 rounded-full ${inGeofence ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {inGeofence ? 'At location' : 'Not at stop location'}
            </span>
          </div>
        </div>

        {/* Counter */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-lg font-medium text-muted-foreground mb-4 uppercase tracking-widest">Passengers Boarding</span>
          <div className="flex items-center justify-center gap-6 w-full px-4">
            <button 
              onClick={handleDecrement}
              className="w-20 h-24 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center text-4xl active:bg-muted/80 active:scale-95 transition-all shadow-sm border border-transparent hover:border-border"
            >
              -
            </button>
            <div className="w-32 h-32 rounded-3xl bg-card border-2 border-primary/20 flex items-center justify-center text-6xl font-bold shadow-inner">
              {count}
            </div>
            <button 
              onClick={handleIncrement}
              className="w-20 h-24 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-4xl active:bg-primary/90 active:scale-95 transition-all shadow-md"
            >
              +
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-8 pt-4">
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
