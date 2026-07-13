import { Router } from "express";
import { db, dutiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateDutyBody, UpdateDutyBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/duties", requireAuth, async (req, res): Promise<void> => {
  const rows = await db.select().from(dutiesTable).orderBy(dutiesTable.number);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/duties", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDutyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.insert(dutiesTable).values(parsed.data).returning();
  res.status(201).json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.get("/duties/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(dutiesTable).where(eq(dutiesTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.patch("/duties/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateDutyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(dutiesTable).set(parsed.data).where(eq(dutiesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, createdAt: row.createdAt.toISOString() });
});

router.delete("/duties/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(dutiesTable).set({ isActive: false }).where(eq(dutiesTable.id, id));
  res.json({ ok: true });
});

export default router;
