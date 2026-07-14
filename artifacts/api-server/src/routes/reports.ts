import { Router } from "express";
import { db, passengerRecordsTable, timetableEntriesTable, dutiesTable, stopsTable, driversTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/reports/daily", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const records = await db
    .select({
      id: passengerRecordsTable.id,
      dutyId: passengerRecordsTable.dutyId,
      dutyName: dutiesTable.name,
      stopId: passengerRecordsTable.stopId,
      stopName: stopsTable.name,
      timetableEntryId: passengerRecordsTable.timetableEntryId,
      scheduledTime: passengerRecordsTable.scheduledTime,
      passengerCount: passengerRecordsTable.passengerCount,
      isLate: passengerRecordsTable.isLate,
      actualSubmissionTime: passengerRecordsTable.actualSubmissionTime,
    })
    .from(passengerRecordsTable)
    .leftJoin(dutiesTable, eq(passengerRecordsTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(passengerRecordsTable.stopId, stopsTable.id))
    .where(eq(passengerRecordsTable.date, date));

  const allEntries = await db.select().from(timetableEntriesTable);
  const duties = await db.select().from(dutiesTable);
  const stops = await db.select().from(stopsTable);

  const totalPassengers = records.reduce((s, r) => s + r.passengerCount, 0);
  const lateDepartures = records.filter(r => r.isLate).length;
  const completedDepartures = records.length;
  const totalDepartures = allEntries.length;
  const missingDepartures = Math.max(0, totalDepartures - completedDepartures);
  const averagePassengers = completedDepartures > 0 ? totalPassengers / completedDepartures : 0;

  // Busiest/quietest
  const sorted = [...records].sort((a, b) => b.passengerCount - a.passengerCount);
  const busiestDeparture = sorted[0] ? `${sorted[0].stopName ?? 'Unknown'} ${sorted[0].scheduledTime instanceof Date ? sorted[0].scheduledTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}` : null;
  const quietestDeparture = sorted[sorted.length - 1] ? `${sorted[sorted.length - 1].stopName ?? 'Unknown'} ${sorted[sorted.length - 1].scheduledTime instanceof Date ? sorted[sorted.length - 1].scheduledTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}` : null;

  // By duty
  const byDuty = duties.map(d => {
    const dr = records.filter(r => r.dutyId === d.id);
    const entries = allEntries.filter(e => e.dutyId === d.id);
    return {
      dutyId: d.id,
      dutyName: d.name,
      totalPassengers: dr.reduce((s, r) => s + r.passengerCount, 0),
      completedDepartures: dr.length,
      totalDepartures: entries.length,
      averagePassengers: dr.length > 0 ? dr.reduce((s, r) => s + r.passengerCount, 0) / dr.length : 0,
    };
  });

  // By stop
  const byStop = stops.map(s => {
    const sr = records.filter(r => r.stopId === s.id);
    return {
      stopId: s.id,
      stopName: s.name,
      totalPassengers: sr.reduce((sum, r) => sum + r.passengerCount, 0),
      totalDepartures: sr.length,
      averagePassengers: sr.length > 0 ? sr.reduce((sum, r) => sum + r.passengerCount, 0) / sr.length : 0,
    };
  });

  // By hour
  const hourMap: Record<number, { total: number; count: number }> = {};
  for (const r of records) {
    const h = r.actualSubmissionTime instanceof Date ? r.actualSubmissionTime.getHours() : 0;
    if (!hourMap[h]) hourMap[h] = { total: 0, count: 0 };
    hourMap[h].total += r.passengerCount;
    hourMap[h].count++;
  }
  const byHour = Object.entries(hourMap).map(([h, v]) => ({ hour: parseInt(h), totalPassengers: v.total, departures: v.count })).sort((a, b) => a.hour - b.hour);

  res.json({ date, totalPassengers, totalDepartures, completedDepartures, missingDepartures, lateDepartures, busiestDeparture, quietestDeparture, averagePassengers, byDuty, byStop, byHour });
});

router.get("/reports/weekly", requireAuth, async (req, res): Promise<void> => {
  const weekStart = (req.query.weekStart as string) || (() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0, 10);
  })();
  const startDate = new Date(weekStart);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const weekEnd = endDate.toISOString().slice(0, 10);

  const days: Array<{ date: string; totalPassengers: number }> = [];
  let totalPassengers = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const records = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.date, dateStr));
    const dayTotal = records.reduce((s, r) => s + r.passengerCount, 0);
    totalPassengers += dayTotal;
    days.push({ date: dateStr, totalPassengers: dayTotal });
  }

  res.json({ weekStart, weekEnd, totalPassengers, averageDaily: days.length > 0 ? totalPassengers / 7 : 0, days });
});

router.get("/reports/monthly", requireAuth, async (req, res): Promise<void> => {
  const year = parseInt((req.query.year as string) || String(new Date().getFullYear()), 10);
  const month = parseInt((req.query.month as string) || String(new Date().getMonth() + 1), 10);

  const daysInMonth = new Date(year, month, 0).getDate();
  let totalPassengers = 0;
  const weeks: Array<{ weekStart: string; totalPassengers: number }> = [];

  // Group by weeks
  const weekMap: Record<string, number> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const weekStart = new Date(year, month - 1, d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const ws = weekStart.toISOString().slice(0, 10);
    const records = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.date, dateStr));
    const dayTotal = records.reduce((s, r) => s + r.passengerCount, 0);
    totalPassengers += dayTotal;
    weekMap[ws] = (weekMap[ws] || 0) + dayTotal;
  }

  for (const [ws, total] of Object.entries(weekMap)) {
    weeks.push({ weekStart: ws, totalPassengers: total });
  }

  res.json({ year, month, totalPassengers, averageDaily: totalPassengers / daysInMonth, weeks: weeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart)) });
});

router.get("/reports/by-duty", requireAuth, async (req, res): Promise<void> => {
  const dateFrom = (req.query.dateFrom as string) || new Date().toISOString().slice(0, 10);
  const dateTo = (req.query.dateTo as string) || new Date().toISOString().slice(0, 10);

  const duties = await db.select().from(dutiesTable);
  const allEntries = await db.select().from(timetableEntriesTable);

  const result = await Promise.all(duties.map(async (d) => {
    const records = await db.select().from(passengerRecordsTable)
      .where(and(eq(passengerRecordsTable.dutyId, d.id)));
    const filtered = records.filter(r => r.date >= dateFrom && r.date <= dateTo);
    const entries = allEntries.filter(e => e.dutyId === d.id);
    return {
      dutyId: d.id,
      dutyName: d.name,
      totalPassengers: filtered.reduce((s, r) => s + r.passengerCount, 0),
      completedDepartures: filtered.length,
      totalDepartures: entries.length,
      averagePassengers: filtered.length > 0 ? filtered.reduce((s, r) => s + r.passengerCount, 0) / filtered.length : 0,
    };
  }));

  res.json(result);
});

router.get("/reports/by-stop", requireAuth, async (req, res): Promise<void> => {
  const dateFrom = (req.query.dateFrom as string) || new Date().toISOString().slice(0, 10);
  const dateTo = (req.query.dateTo as string) || new Date().toISOString().slice(0, 10);

  const stops = await db.select().from(stopsTable);
  const result = await Promise.all(stops.map(async (s) => {
    const records = await db.select().from(passengerRecordsTable)
      .where(eq(passengerRecordsTable.stopId, s.id));
    const filtered = records.filter(r => r.date >= dateFrom && r.date <= dateTo);
    return {
      stopId: s.id,
      stopName: s.name,
      totalPassengers: filtered.reduce((sum, r) => sum + r.passengerCount, 0),
      totalDepartures: filtered.length,
      averagePassengers: filtered.length > 0 ? filtered.reduce((sum, r) => sum + r.passengerCount, 0) / filtered.length : 0,
    };
  }));

  res.json(result);
});

router.get("/reports/by-hour", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const records = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.date, date));
  const hourMap: Record<number, { total: number; count: number }> = {};
  for (const r of records) {
    const h = r.actualSubmissionTime.getHours();
    if (!hourMap[h]) hourMap[h] = { total: 0, count: 0 };
    hourMap[h].total += r.passengerCount;
    hourMap[h].count++;
  }
  const result = Object.entries(hourMap).map(([h, v]) => ({ hour: parseInt(h), totalPassengers: v.total, departures: v.count })).sort((a, b) => a.hour - b.hour);
  res.json(result);
});

router.get("/reports/missing-submissions", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const allEntries = await db
    .select({
      id: timetableEntriesTable.id,
      dutyId: timetableEntriesTable.dutyId,
      dutyName: dutiesTable.name,
      stopId: timetableEntriesTable.stopId,
      stopName: stopsTable.name,
      scheduledTime: timetableEntriesTable.scheduledTime,
    })
    .from(timetableEntriesTable)
    .leftJoin(dutiesTable, eq(timetableEntriesTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(timetableEntriesTable.stopId, stopsTable.id));

  const submitted = await db.select().from(passengerRecordsTable).where(eq(passengerRecordsTable.date, date));
  const submittedIds = new Set(submitted.map(r => r.timetableEntryId));

  const missing = allEntries.filter(e => !submittedIds.has(e.id)).map(e => ({
    timetableEntryId: e.id,
    dutyId: e.dutyId,
    dutyName: e.dutyName ?? 'Unknown',
    stopId: e.stopId,
    stopName: e.stopName ?? 'Unknown',
    scheduledTime: e.scheduledTime,
    date,
    driverId: null,
    driverName: null,
  }));

  res.json(missing);
});

router.get("/reports/late-submissions", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const records = await db
    .select({
      id: passengerRecordsTable.id,
      dutyId: passengerRecordsTable.dutyId,
      dutyName: dutiesTable.name,
      stopId: passengerRecordsTable.stopId,
      stopName: stopsTable.name,
      scheduledTime: passengerRecordsTable.scheduledTime,
      actualSubmissionTime: passengerRecordsTable.actualSubmissionTime,
      minutesLate: passengerRecordsTable.minutesLate,
      passengerCount: passengerRecordsTable.passengerCount,
      date: passengerRecordsTable.date,
      driverName: driversTable.name,
    })
    .from(passengerRecordsTable)
    .leftJoin(dutiesTable, eq(passengerRecordsTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(passengerRecordsTable.stopId, stopsTable.id))
    .leftJoin(driversTable, eq(passengerRecordsTable.driverId, driversTable.id))
    .where(and(eq(passengerRecordsTable.date, date), eq(passengerRecordsTable.isLate, true)));

  res.json(records.map(r => ({
    ...r,
    dutyName: r.dutyName ?? 'Unknown',
    stopName: r.stopName ?? 'Unknown',
    driverName: r.driverName ?? null,
    scheduledTime: r.scheduledTime.toISOString(),
    actualSubmissionTime: r.actualSubmissionTime.toISOString(),
    minutesLate: r.minutesLate ?? 0,
  })));
});

router.get("/reports/duty-loadings", requireAuth, async (req, res): Promise<void> => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const duties = await db.select().from(dutiesTable).where(eq(dutiesTable.isActive, true));

  const entries = await db
    .select({
      id: timetableEntriesTable.id,
      dutyId: timetableEntriesTable.dutyId,
      stopId: timetableEntriesTable.stopId,
      stopName: stopsTable.name,
      scheduledTime: timetableEntriesTable.scheduledTime,
      sequenceOrder: timetableEntriesTable.sequenceOrder,
      runNumber: timetableEntriesTable.runNumber,
      isBreakAfter: timetableEntriesTable.isBreakAfter,
    })
    .from(timetableEntriesTable)
    .leftJoin(stopsTable, eq(timetableEntriesTable.stopId, stopsTable.id));

  const records = await db
    .select({
      id: passengerRecordsTable.id,
      timetableEntryId: passengerRecordsTable.timetableEntryId,
      dutyId: passengerRecordsTable.dutyId,
      driverId: passengerRecordsTable.driverId,
      driverName: driversTable.name,
      passengerCount: passengerRecordsTable.passengerCount,
      isLate: passengerRecordsTable.isLate,
      minutesLate: passengerRecordsTable.minutesLate,
    })
    .from(passengerRecordsTable)
    .leftJoin(driversTable, eq(passengerRecordsTable.driverId, driversTable.id))
    .where(eq(passengerRecordsTable.date, date));

  const result = duties.map(duty => {
    const dutyEntries = entries
      .filter(e => e.dutyId === duty.id)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const dutyRecords = records.filter(r => r.dutyId === duty.id);
    const recordByEntryId = new Map(dutyRecords.map(r => [r.timetableEntryId, r]));

    const driverName = dutyRecords[0]?.driverName ?? null;
    const totalPassengers = dutyRecords.reduce((s, r) => s + r.passengerCount, 0);
    const completed = dutyRecords.length;

    const stops = dutyEntries.map(e => {
      const rec = recordByEntryId.get(e.id) ?? null;
      return {
        timetableEntryId: e.id,
        sequenceOrder: e.sequenceOrder,
        runNumber: e.runNumber,
        isBreakAfter: e.isBreakAfter,
        scheduledTime: e.scheduledTime,
        stopName: e.stopName ?? 'Unknown',
        passengerCount: rec ? rec.passengerCount : null,
        isLate: rec?.isLate ?? false,
        minutesLate: rec?.minutesLate ?? 0,
        recorded: !!rec,
      };
    });

    return {
      dutyId: duty.id,
      dutyName: duty.name,
      dutyNumber: duty.number,
      driverName,
      totalPassengers,
      completed,
      total: dutyEntries.length,
      stops,
    };
  });

  res.json({ date, duties: result });
});

router.get("/reports/export", requireAuth, async (req, res): Promise<void> => {
  const dateFrom = (req.query.dateFrom as string) || new Date().toISOString().slice(0, 10);
  const dateTo = (req.query.dateTo as string) || new Date().toISOString().slice(0, 10);

  const records = await db
    .select({
      id: passengerRecordsTable.id,
      date: passengerRecordsTable.date,
      driverName: driversTable.name,
      dutyName: dutiesTable.name,
      stopName: stopsTable.name,
      scheduledTime: passengerRecordsTable.scheduledTime,
      actualSubmissionTime: passengerRecordsTable.actualSubmissionTime,
      passengerCount: passengerRecordsTable.passengerCount,
      isLate: passengerRecordsTable.isLate,
      minutesLate: passengerRecordsTable.minutesLate,
    })
    .from(passengerRecordsTable)
    .leftJoin(driversTable, eq(passengerRecordsTable.driverId, driversTable.id))
    .leftJoin(dutiesTable, eq(passengerRecordsTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(passengerRecordsTable.stopId, stopsTable.id));

  const filtered = records.filter(r => r.date >= dateFrom && r.date <= dateTo);

  const header = "ID,Date,Driver,Duty,Stop,Scheduled Time,Submission Time,Passengers,Late,Minutes Late\n";
  const rows = filtered.map(r =>
    `${r.id},${r.date},"${r.driverName ?? ''}","${r.dutyName ?? ''}","${r.stopName ?? ''}","${r.scheduledTime instanceof Date ? r.scheduledTime.toISOString() : ''}","${r.actualSubmissionTime instanceof Date ? r.actualSubmissionTime.toISOString() : ''}",${r.passengerCount},${r.isLate},${r.minutesLate ?? 0}`
  ).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="passenger-report-${dateFrom}-to-${dateTo}.csv"`);
  res.send(header + rows);
});

export default router;
