import { Router } from "express";
import { db, timetableEntriesTable, dutiesTable, stopsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateTimetableEntryBody, UpdateTimetableEntryBody, ListTimetablesQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/timetables", requireAuth, async (req, res): Promise<void> => {
  const params = ListTimetablesQueryParams.safeParse(req.query);
  const dutyId = params.success ? params.data.dutyId : undefined;

  const rows = await db
    .select({
      id: timetableEntriesTable.id,
      dutyId: timetableEntriesTable.dutyId,
      dutyName: dutiesTable.name,
      stopId: timetableEntriesTable.stopId,
      stopName: stopsTable.name,
      scheduledTime: timetableEntriesTable.scheduledTime,
      sequenceOrder: timetableEntriesTable.sequenceOrder,
      direction: timetableEntriesTable.direction,
      createdAt: timetableEntriesTable.createdAt,
    })
    .from(timetableEntriesTable)
    .leftJoin(dutiesTable, eq(timetableEntriesTable.dutyId, dutiesTable.id))
    .leftJoin(stopsTable, eq(timetableEntriesTable.stopId, stopsTable.id))
    .where(dutyId ? eq(timetableEntriesTable.dutyId, dutyId) : undefined)
    .orderBy(timetableEntriesTable.sequenceOrder);

  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/timetables", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTimetableEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(timetableEntriesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, dutyName: null, stopName: null, createdAt: row.createdAt.toISOString() });
});

router.get("/timetables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(timetableEntriesTable).where(eq(timetableEntriesTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, dutyName: null, stopName: null, createdAt: row.createdAt.toISOString() });
});

router.patch("/timetables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateTimetableEntryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(timetableEntriesTable).set(parsed.data).where(eq(timetableEntriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, dutyName: null, stopName: null, createdAt: row.createdAt.toISOString() });
});

router.delete("/timetables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(timetableEntriesTable).where(eq(timetableEntriesTable.id, id));
  res.json({ ok: true });
});

export default router;
