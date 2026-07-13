import { Router } from "express";
import { db, usersTable, driversTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { username, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

  let driverName: string | null = null;
  if (user.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, user.driverId)).limit(1);
    driverName = driver?.name ?? null;
  }

  (req.session as any).userId = user.id;
  (req.session as any).role = user.role;

  res.json({ id: user.id, username: user.username, role: user.role, driverId: user.driverId ?? null, driverName });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy(() => {});
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  let driverName: string | null = null;
  if (user.driverId) {
    const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, user.driverId)).limit(1);
    driverName = driver?.name ?? null;
  }

  res.json({ id: user.id, username: user.username, role: user.role, driverId: user.driverId ?? null, driverName });
});

export default router;
