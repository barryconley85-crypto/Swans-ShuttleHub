import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  useSyncOfflinePassengerRecords,
  useSyncOfflineGpsPositions,
  PassengerRecordInput,
  GpsPositionInput,
} from '@workspace/api-client-react';

interface OfflineContextType {
  isOnline: boolean;
  queuePassengerRecord: (record: PassengerRecordInput) => void;
  queueGpsPosition: (position: GpsPositionInput) => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  queuePassengerRecord: () => {},
  queueGpsPosition: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const syncPassengers = useSyncOfflinePassengerRecords();
  const syncGps = useSyncOfflineGpsPositions();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      const passengerQueueStr = localStorage.getItem('shuttle_passenger_queue');
      if (passengerQueueStr) {
        try {
          const records: PassengerRecordInput[] = JSON.parse(passengerQueueStr);
          if (records.length > 0) {
            syncPassengers.mutate({ data: { records } }, {
              onSuccess: () => localStorage.removeItem('shuttle_passenger_queue')
            });
          }
        } catch (e) {
          console.error('Failed to sync offline passenger records', e);
        }
      }

      const gpsQueueStr = localStorage.getItem('shuttle_gps_queue');
      if (gpsQueueStr) {
        try {
          const positions: GpsPositionInput[] = JSON.parse(gpsQueueStr);
          if (positions.length > 0) {
            syncGps.mutate({ data: { positions } }, {
              onSuccess: () => localStorage.removeItem('shuttle_gps_queue')
            });
          }
        } catch (e) {
          console.error('Failed to sync offline GPS records', e);
        }
      }
    }
  }, [isOnline]); // Intentionally omitting sync hook deps to avoid infinite loops

  const queuePassengerRecord = (record: PassengerRecordInput) => {
    const existingStr = localStorage.getItem('shuttle_passenger_queue');
    const existing: PassengerRecordInput[] = existingStr ? JSON.parse(existingStr) : [];
    existing.push(record);
    localStorage.setItem('shuttle_passenger_queue', JSON.stringify(existing));
  };

  const queueGpsPosition = (position: GpsPositionInput) => {
    const existingStr = localStorage.getItem('shuttle_gps_queue');
    const existing: GpsPositionInput[] = existingStr ? JSON.parse(existingStr) : [];
    existing.push(position);
    localStorage.setItem('shuttle_gps_queue', JSON.stringify(existing));
  };

  return (
    <OfflineContext.Provider value={{ isOnline, queuePassengerRecord, queueGpsPosition }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
