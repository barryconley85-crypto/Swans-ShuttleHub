import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRecordGpsPosition } from '@workspace/api-client-react';
import { useOffline } from './offline-context';
import { useAuth } from './auth-context';

interface GpsContextType {
  lastPosition: GeolocationPosition | null;
  error: string | null;
  isTracking: boolean;
  startTracking: (dutyId: number) => void;
  stopTracking: () => void;
}

const GpsContext = createContext<GpsContextType>({
  lastPosition: null,
  error: null,
  isTracking: false,
  startTracking: () => {},
  stopTracking: () => {},
});

export function GpsProvider({ children }: { children: React.ReactNode }) {
  const [lastPosition, setLastPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [dutyId, setDutyId] = useState<number | null>(null);
  
  const recordGps = useRecordGpsPosition();
  const { isOnline, queueGpsPosition } = useOffline();
  const { user } = useAuth();

  useEffect(() => {
    let watchId: number;
    let intervalId: number;

    if (isTracking && dutyId && user?.driverId) {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by your browser");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLastPosition(position);
          setError(null);
        },
        (err) => {
          setError(err.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      // Record every 30s
      intervalId = window.setInterval(() => {
        if (lastPosition && user?.driverId) {
          const payload = {
            driverId: user.driverId,
            dutyId,
            latitude: lastPosition.coords.latitude,
            longitude: lastPosition.coords.longitude,
            speed: lastPosition.coords.speed || undefined,
            heading: lastPosition.coords.heading || undefined,
          };
          
          if (isOnline) {
            recordGps.mutate({ data: payload });
          } else {
            queueGpsPosition(payload);
          }
        }
      }, 30000);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isTracking, dutyId, user?.driverId, lastPosition, isOnline]);

  const startTracking = (dId: number) => {
    setDutyId(dId);
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
    setDutyId(null);
  };

  return (
    <GpsContext.Provider value={{ lastPosition, error, isTracking, startTracking, stopTracking }}>
      {children}
    </GpsContext.Provider>
  );
}

export function useGps() {
  return useContext(GpsContext);
}
