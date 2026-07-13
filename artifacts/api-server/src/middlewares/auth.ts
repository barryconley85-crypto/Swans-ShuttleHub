import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = req.session as any;
  if (!session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (session.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
