import { Router } from "express";
import { db, vehiclesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateVehicleBody, UpdateVehicleBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/vehicles", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(vehiclesTable).orderBy(vehiclesTable.registration);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/vehicles", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateVehicleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(vehiclesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(vehiclesTable).where(eq(vehiclesTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateVehicleBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(vehiclesTable).set(parsed.data).where(eq(vehiclesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/vehicles/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(vehiclesTable).set({ isActive: false }).where(eq(vehiclesTable.id, id));
  res.json({ ok: true });
});

export default router;
