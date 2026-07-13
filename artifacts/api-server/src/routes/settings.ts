import { Router } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertSettingBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/settings", requireAdmin, async (req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).orderBy(settingsTable.key);
  res.json(rows.map(r => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
});

router.put("/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpsertSettingBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db
    .insert(settingsTable)
    .values(parsed.data)
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: parsed.data.value, description: parsed.data.description, updatedAt: new Date() } })
    .returning();
  res.json({ ...row, updatedAt: row.updatedAt.toISOString() });
});

export default router;
