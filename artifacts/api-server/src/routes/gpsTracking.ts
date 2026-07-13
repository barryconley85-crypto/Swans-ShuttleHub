import { Router } from "express";
import { db, gpsTrackingTable, driversTable, dutiesTable, stopsTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { RecordGpsPositionBody, SyncOfflineGpsPositionsBody } from "@workspace/api-zod";
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
      const dist = haversineDistance(lat, lon, stop.latitude, stop.longitude);
      if (dist <= stop.geofenceRadiusMeters) return stop.name;
    }
  }
  return null;
}

router.post("/gps", requireAuth, async (req, res): Promise<void> => {
  const parsed = RecordGpsPositionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { driverId, dutyId, latitude, longitude, speed, heading } = parsed.data;
  const [row] = await db.insert(gpsTrackingTable).values({
    driverId,
    dutyId,
    latitude,
    longitude,
    speed: speed ?? null,
    heading: heading ?? null,
  }).returning();

  const currentStopName = await getNearestStop(latitude, longitude);

  res.status(201).json({
    ...row,
    driverName: null,
    dutyName: null,
    currentStopName,
    recordedAt: row.recordedAt.toISOString(),
  });
});

router.get("/gps/latest", requireAuth, async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get latest position per duty today using raw SQL subquery
  const rows = await db.execute(sql`
    SELECT DISTINCT ON (g.duty_id)
      g.id, g.driver_id as "driverId", g.duty_id as "dutyId",
      g.latitude, g.longitude, g.speed, g.heading, g.recorded_at as "recordedAt",
      d.name as "driverName", du.name as "dutyName"
    FROM gps_tracking g
    LEFT JOIN drivers d ON g.driver_id = d.id
    LEFT JOIN duties du ON g.duty_id = du.id
    WHERE g.recorded_at >= ${today}
    ORDER BY g.duty_id, g.recorded_at DESC
  `);

  const positions = await Promise.all((rows.rows as any[]).map(async (r: any) => {
    const currentStopName = await getNearestStop(r.latitude, r.longitude);
    return {
      id: r.id,
      driverId: r.driverId,
      driverName: r.driverName ?? null,
      dutyId: r.dutyId,
      dutyName: r.dutyName ?? null,
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      speed: r.speed ? parseFloat(r.speed) : null,
      heading: r.heading ? parseFloat(r.heading) : null,
      currentStopName,
      recordedAt: r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
    };
  }));

  res.json(positions);
});

router.post("/gps/sync", requireAuth, async (req, res): Promise<void> => {
  const parsed = SyncOfflineGpsPositionsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  for (const pos of parsed.data.positions) {
    await db.insert(gpsTrackingTable).values({
      driverId: pos.driverId,
      dutyId: pos.dutyId,
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: pos.speed ?? null,
      heading: pos.heading ?? null,
    });
  }

  res.json({ ok: true });
});

export default router;
