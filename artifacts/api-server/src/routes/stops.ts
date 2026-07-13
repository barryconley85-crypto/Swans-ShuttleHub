import { Router } from "express";
import { db, stopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateStopBody, UpdateStopBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/stops", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(stopsTable).orderBy(stopsTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/stops", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateStopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(stopsTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/stops/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(stopsTable).where(eq(stopsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/stops/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateStopBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(stopsTable).set(parsed.data).where(eq(stopsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/stops/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(stopsTable).set({ isActive: false }).where(eq(stopsTable.id, id));
  res.json({ ok: true });
});

export default router;
