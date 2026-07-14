import { Router } from "express";
import { db, passengerRecordsTable, dutiesTable, timetableEntriesTable, driversTable, vehiclesTable, gpsTrackingTable, stopsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function getNearestStop(lat: number, lon: number): Promise<string | null> {
  const stops = await db.select().from(stopsTable).where(eq(stopsTable.isActive, true));
  for (const stop of stops) {
    if (stop.latitude && stop.longitude) {
      if (haversineDistance(lat, lon, stop.latitude, stop.longitude) <= stop.geofenceRadiusMeters) return stop.name;
    }
  }
  return null;
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const totalResult = await db.execute(sql`
    SELECT COALESCE(SUM(passenger_count), 0) as total FROM passenger_records WHERE date = ${today}
  `);
  const todayPassengerTotal = parseInt(String(totalResult.rows[0]?.total ?? 0), 10);

  const duties = await db.select().from(dutiesTable).where(eq(dutiesTable.isActive, true));
  const activeDuties = duties.length;

  const allEntries = await db.select().from(timetableEntriesTable);
  const totalDepartures = allEntries.length;

  const records = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.date, today));
  const completedDepartures = records.length;
  const missingCount = Math.max(0, totalDepartures - completedDepartures);
  const lateCount = records.filter(r => r.isLate).length;

  res.json({ todayPassengerTotal, activeDuties, completedDepartures, totalDepartures, missingCount, lateCount });
});

router.get("/dashboard/duty-status", requireAuth, async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

  const duties = await db.select().from(dutiesTable).where(eq(dutiesTable.isActive, true));

  const statuses = await Promise.all(duties.map(async (duty) => {
    // Get latest GPS for this duty today
    const gpsResult = await db.execute(sql`
      SELECT g.*, d.name as driver_name, v.registration as vehicle_reg, d.vehicle_id
      FROM gps_tracking g
      LEFT JOIN drivers d ON g.driver_id = d.id
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      WHERE g.duty_id = ${duty.id} AND g.recorded_at >= ${new Date(today)}
      ORDER BY g.recorded_at DESC
      LIMIT 1
    `);
    const gps = (gpsResult.rows as any[])[0];

    // Get passenger records for today
    const records = await db.select().from(passengerRecordsTable)
      .where(and(eq(passengerRecordsTable.dutyId, duty.id), eq(passengerRecordsTable.date, today)));
    const totalEntries = await db.select().from(timetableEntriesTable).where(eq(timetableEntriesTable.dutyId, duty.id));

    const todayPassengerTotal = records.reduce((sum, r) => sum + r.passengerCount, 0);
    const lastRecord = records.sort((a, b) => b.actualSubmissionTime.getTime() - a.actualSubmissionTime.getTime())[0];
    const hasMissing = records.length < totalEntries.length && totalEntries.length > 0;
    const hasLate = records.some(r => r.isLate);

    let status: "normal" | "late" | "missing" | "offline" = "offline";
    if (!gps || new Date(gps.recorded_at) < fifteenMinsAgo) {
      status = "offline";
    } else if (hasMissing) {
      status = "missing";
    } else if (hasLate) {
      status = "late";
    } else {
      status = "normal";
    }

    let currentStopName: string | null = null;
    if (gps) {
      currentStopName = await getNearestStop(parseFloat(gps.latitude), parseFloat(gps.longitude));
    }

    return {
      dutyId: duty.id,
      dutyName: duty.name,
      driverId: gps?.driver_id ?? null,
      driverName: gps?.driver_name ?? null,
      vehicleRegistration: gps?.vehicle_reg ?? null,
      status,
      currentStopName,
      latitude: gps ? parseFloat(gps.latitude) : null,
      longitude: gps ? parseFloat(gps.longitude) : null,
      speed: gps?.speed ? parseFloat(gps.speed) : null,
      heading: gps?.heading ? parseFloat(gps.heading) : null,
      lastGpsUpdate: gps?.recorded_at instanceof Date ? gps.recorded_at.toISOString() : gps?.recorded_at ?? null,
      lastPassengerCount: lastRecord?.passengerCount ?? null,
      todayPassengerTotal,
      completedDepartures: records.length,
      totalDepartures: totalEntries.length,
    };
  }));

  res.json(statuses);
});

export default router;
