import React, { useEffect, useState } from 'react';
import { DutyStatus } from '@workspace/api-client-react';

interface MapComponentProps {
  statuses: DutyStatus[];
}

export default function MapComponent({ statuses }: MapComponentProps) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default || leaflet);
    });
  }, []);

  useEffect(() => {
    if (!L) return;

    const map = L.map('map').setView([51.505, -0.09], 13); // Default London/UK
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    const markers: any[] = [];
    const group = L.featureGroup();

    statuses.forEach(status => {
      if (status.latitude && status.longitude) {
        let color = '#9ca3af'; // offline/grey
        if (status.status === 'normal') color = '#22c55e'; // green
        else if (status.status === 'late') color = '#f59e0b'; // amber
        else if (status.status === 'missing') color = '#ef4444'; // red

        const markerHtmlStyles = `
          background-color: ${color};
          width: 1.5rem;
          height: 1.5rem;
          display: block;
          left: -0.75rem;
          top: -0.75rem;
          position: relative;
          border-radius: 3rem 3rem 0;
          transform: rotate(45deg);
          border: 2px solid #FFFFFF;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        `;

        const icon = L.divIcon({
          className: 'custom-pin',
          iconAnchor: [0, 24],
          labelAnchor: [-6, 0],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}" />`
        });

        const popupContent = `
          <div style="font-family: inherit; color: #000; padding: 4px;">
            <strong style="font-size: 14px; display: block; margin-bottom: 4px;">${status.dutyName}</strong>
            <div style="font-size: 12px; margin-bottom: 2px;">Vehicle: ${status.vehicleRegistration || 'Unknown'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;">Driver: ${status.driverName || 'Unassigned'}</div>
            <div style="font-size: 12px; margin-bottom: 2px;">Speed: ${status.speed ? Math.round(status.speed * 2.23694) + ' mph' : '0 mph'}</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">Passengers Today: ${status.todayPassengerTotal || 0}</div>
          </div>
        `;

        const marker = L.marker([status.latitude, status.longitude], { icon })
          .bindPopup(popupContent)
          .addTo(group);
        markers.push(marker);
      }
    });

    if (markers.length > 0) {
      map.addTo(map);
      group.addTo(map);
      map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }

    return () => {
      map.remove();
    };
  }, [L, statuses]);

  return <div id="map" className="w-full h-full z-0" />;
}
