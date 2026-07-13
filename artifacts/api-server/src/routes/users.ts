import { Router } from "express";
import { db, usersTable, driversTable, auditLogTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { CreateUserBody, UpdateUserBody, ResetUserPasswordBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      driverId: usersTable.driverId,
      driverName: driversTable.name,
      isActive: usersTable.isActive,
      createdAt: usersTable.createdAt,
      lastLoginAt: usersTable.lastLoginAt,
    })
    .from(usersTable)
    .leftJoin(driversTable, eq(usersTable.driverId, driversTable.id))
    .orderBy(usersTable.username);

  res.json(rows.map(r => ({
    ...r,
    driverName: r.driverName ?? null,
    createdAt: r.createdAt.toISOString(),
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
  })));
});

router.post("/users", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { username, password, role, driverId } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);
  const [row] = await db.insert(usersTable).values({ username, passwordHash, role, driverId: driverId ?? null }).returning();
  res.status(201).json({ ...row, driverName: null, createdAt: row.createdAt.toISOString(), lastLoginAt: null });
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, driverName: null, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null });
});

router.patch("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [row] = await db.update(usersTable).set(parsed.data).where(eq(usersTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...row, driverName: null, createdAt: row.createdAt.toISOString(), lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null });
});

router.delete("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.update(usersTable).set({ isActive: false }).where(eq(usersTable.id, id));
  res.json({ ok: true });
});

router.post("/users/:id/reset-password", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const parsed = ResetUserPasswordBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, id));
  await db.insert(auditLogTable).values({
    action: "RESET_PASSWORD",
    tableName: "users",
    recordId: id,
    ipAddress: req.ip,
  });
  res.json({ ok: true });
});

export default router;
