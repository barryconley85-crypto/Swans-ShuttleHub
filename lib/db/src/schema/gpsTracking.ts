import { pgTable, serial, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gpsTrackingTable = pgTable("gps_tracking", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull(),
  dutyId: integer("duty_id").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  speed: doublePrecision("speed"),
  heading: doublePrecision("heading"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGpsTrackingSchema = createInsertSchema(gpsTrackingTable).omit({ id: true, recordedAt: true });
export type InsertGpsTracking = z.infer<typeof insertGpsTrackingSchema>;
export type GpsTracking = typeof gpsTrackingTable.$inferSelect;
