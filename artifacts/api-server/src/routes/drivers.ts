import { Router } from "express";
import { db, driversTable, vehiclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDriverBody, UpdateDriverBody, GetDriverParams, UpdateDriverParams, DeleteDriverParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/drivers", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: driversTable.id,
      name: driversTable.name,
      employeeNumber: driversTable.employeeNumber,
      phoneNumber: driversTable.phoneNumber,
      isActive: driversTable.isActive,
      vehicleId: driversTable.vehicleId,
      vehicleRegistration: vehiclesTable.registration,
      createdAt: driversTable.createdAt,
    })
    .from(driversTable)
    .leftJoin(vehiclesTable, eq(driversTable.vehicleId, vehiclesTable.id))
    .orderBy(driversTable.name);

  res.json(rows.map(r => ({
    ...r,
    vehicleRegistration: r.vehicleRegistration ?? null,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/drivers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(driversTable).values(parsed.data).returning();
  res.status(201).json({ ...row, vehicleRegistration: null, createdAt: row.createdAt.toISOString() });
});

router.get("/drivers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, vehicleRegistration: null, createdAt: row.createdAt.toISOString() });
});

router.patch("/drivers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(driversTable).set(parsed.data).where(eq(driversTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, vehicleRegistration: null, createdAt: row.createdAt.toISOString() });
});

router.delete("/drivers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.update(driversTable).set({ isActive: false }).where(eq(driversTable.id, id));
  res.json({ ok: true });
});

export default router;
