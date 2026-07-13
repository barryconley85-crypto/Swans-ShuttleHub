import { pgTable, text, serial, timestamp, boolean, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stopsTable = pgTable("stops", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geofenceRadiusMeters: integer("geofence_radius_meters").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStopSchema = createInsertSchema(stopsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStop = z.infer<typeof insertStopSchema>;
export type Stop = typeof stopsTable.$inferSelect;
