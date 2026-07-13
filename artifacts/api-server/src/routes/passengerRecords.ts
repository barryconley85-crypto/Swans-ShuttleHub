import { Router } from "express";
import { db, passengerRecordsTable, driversTable, dutiesTable, stopsTable, timetableEntriesTable, auditLogTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { CreatePassengerRecordBody, SyncOfflinePassengerRecordsBody, ListPassengerRecordsQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function formatRecord(r: any, driverName: string | null, dutyName: string | null, stopName: string | null) {
  return {
    ...r,
    driverName,
    dutyName,
    stopName,
    scheduledTime: r.scheduledTime instanceof Date ? r.scheduledTime.toISOString() : r.scheduledTime,
    actualSubmissionTime: r.actualSubmissionTime instanceof Date ? r.actualSubmissionTime.toISOString() : r.actualSubmissionTime,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/passenger-records", requireAuth, async (req, res): Promise<void> => {
  const params = ListPassengerRecordsQueryParams.safeParse(req.query);
  const filter = params.success ? params.data : {};

  const rows = await db
    .select({
      id: passengerRecordsTable.id,
      date: passengerRecordsTable.date,
      driverId: passengerRecordsTable.driverId,
      driverName: driversTable.name,
      dutyId: passengerRecordsTable.dutyId,
      dutyName: dutiesTable.name,
      stopId: passengerRecordsTable.stopId,
      stopName: stopsTable.name,
      timetableEntryId: passengerRecordsTable.timetableEntryId,
      scheduledTime: passengerRecordsTable.scheduledTime,
      actualSubmissionTime: passengerRecordsTable.actualSubmissionTime,
      passengerCount: passengerRecordsTable.passengerCount,
      latitude: passengerRecordsTable.latitude,
      longitude: passengerRecordsTable.longitude,
      isLate: passengerRecordsTable.isLate,
      minutesLate: passengerRecordsTable.minutesLate,
      createdAt: passengerRecordsTable.createdAt,
    })
    .from(passengerRecordsTable)
    .leftJoin(driversTable, eq(passengerRecordsTable.driverId, driversTable.id))
    .leftJoin(dutiesTable, eq(passengerRecordsTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(passengerRecordsTable.stopId, stopsTable.id))
    .orderBy(passengerRecordsTable.createdAt);

  const filtered = rows.filter(r => {
    if (filter.date && r.date !== filter.date) return false;
    if (filter.dutyId && r.dutyId !== filter.dutyId) return false;
    if (filter.driverId && r.driverId !== filter.driverId) return false;
    if (filter.stopId && r.stopId !== filter.stopId) return false;
    return true;
  });

  res.json(filtered.map(r => ({
    ...r,
    driverName: r.driverName ?? null,
    dutyName: r.dutyName ?? null,
    stopName: r.stopName ?? null,
    scheduledTime: r.scheduledTime instanceof Date ? r.scheduledTime.toISOString() : r.scheduledTime,
    actualSubmissionTime: r.actualSubmissionTime instanceof Date ? r.actualSubmissionTime.toISOString() : r.actualSubmissionTime,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

router.post("/passenger-records", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePassengerRecordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { driverId, dutyId, stopId, timetableEntryId, passengerCount, latitude, longitude } = parsed.data;

  // Check for existing record for this timetable entry today
  const today = new Date().toISOString().slice(0, 10);
  const [existing] = await db
    .select()
    .from(passengerRecordsTable)
    .where(and(
      eq(passengerRecordsTable.timetableEntryId, timetableEntryId),
      eq(passengerRecordsTable.date, today)
    ))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "This departure has already been recorded." });
    return;
  }

  // Get scheduled time from timetable entry
  const [entry] = await db.select().from(timetableEntriesTable).where(eq(timetableEntriesTable.id, timetableEntryId)).limit(1);
  const now = new Date();
  const scheduledTimeParts = entry?.scheduledTime?.split(":") ?? ["0", "0"];
  const scheduledDt = new Date(today);
  scheduledDt.setHours(parseInt(scheduledTimeParts[0], 10), parseInt(scheduledTimeParts[1], 10), 0, 0);

  const diffMs = now.getTime() - scheduledDt.getTime();
  const minutesLate = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
  const isLate = minutesLate > 5;

  const [row] = await db.insert(passengerRecordsTable).values({
    date: today,
    driverId,
    dutyId,
    stopId,
    timetableEntryId,
    scheduledTime: scheduledDt,
    actualSubmissionTime: now,
    passengerCount,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    isLate,
    minutesLate: isLate ? minutesLate : null,
  }).returning();

  await db.insert(auditLogTable).values({
    action: "CREATE_PASSENGER_RECORD",
    tableName: "passenger_records",
    recordId: row.id,
    newValue: JSON.stringify({ passengerCount, stopId, dutyId }),
    ipAddress: req.ip,
  });

  res.status(201).json({
    ...row,
    driverName: null,
    dutyName: null,
    stopName: null,
    scheduledTime: row.scheduledTime.toISOString(),
    actualSubmissionTime: row.actualSubmissionTime.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
});

router.get("/passenger-records/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    ...row,
    driverName: null,
    dutyName: null,
    stopName: null,
    scheduledTime: row.scheduledTime.toISOString(),
    actualSubmissionTime: row.actualSubmissionTime.toISOString(),
    createdAt: row.createdAt.toISOString(),
  });
});

router.post("/passenger-records/sync", requireAuth, async (req, res): Promise<void> => {
  const parsed = SyncOfflinePassengerRecordsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const record of parsed.data.records) {
    try {
      const [existing] = await db
        .select()
        .from(passengerRecordsTable)
        .where(and(
          eq(passengerRecordsTable.timetableEntryId, record.timetableEntryId),
          eq(passengerRecordsTable.date, today)
        ))
        .limit(1);

      if (existing) { skipped++; continue; }

      const [entry] = await db.select().from(timetableEntriesTable).where(eq(timetableEntriesTable.id, record.timetableEntryId)).limit(1);
      const now = new Date();
      const parts = entry?.scheduledTime?.split(":") ?? ["0", "0"];
      const scheduledDt = new Date(today);
      scheduledDt.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);

      await db.insert(passengerRecordsTable).values({
        date: today,
        driverId: record.driverId,
        dutyId: record.dutyId,
        stopId: record.stopId,
        timetableEntryId: record.timetableEntryId,
        scheduledTime: scheduledDt,
        actualSubmissionTime: now,
        passengerCount: record.passengerCount,
        latitude: record.latitude ?? null,
        longitude: record.longitude ?? null,
        isLate: false,
        minutesLate: null,
      });
      synced++;
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  res.json({ synced, skipped, errors });
});

export default router;
