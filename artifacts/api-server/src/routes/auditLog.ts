import { Router } from "express";
import { db, auditLogTable } from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/audit-log", requireAdmin, async (req, res): Promise<void> => {
  const limit = parseInt((req.query.limit as string) || "50", 10);
  const offset = parseInt((req.query.offset as string) || "0", 10);
  const userId = req.query.userId ? parseInt(req.query.userId as string, 10) : undefined;
  const action = req.query.action as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  const rows = await db.select().from(auditLogTable).orderBy(auditLogTable.createdAt);
  
  let filtered = rows;
  if (userId) filtered = filtered.filter(r => r.userId === userId);
  if (action) filtered = filtered.filter(r => r.action.includes(action));
  if (dateFrom) filtered = filtered.filter(r => r.createdAt >= new Date(dateFrom));
  if (dateTo) filtered = filtered.filter(r => r.createdAt <= new Date(dateTo));

  const total = filtered.length;
  const entries = filtered.slice(offset, offset + limit).map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  res.json({ entries, total, limit, offset });
});

export default router;
