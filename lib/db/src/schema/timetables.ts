import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const timetableEntriesTable = pgTable("timetable_entries", {
  id: serial("id").primaryKey(),
  dutyId: integer("duty_id").notNull(),
  stopId: integer("stop_id").notNull(),
  scheduledTime: text("scheduled_time").notNull(), // HH:MM
  sequenceOrder: integer("sequence_order").notNull(),
  direction: text("direction"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTimetableEntrySchema = createInsertSchema(timetableEntriesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTimetableEntry = z.infer<typeof insertTimetableEntrySchema>;
export type TimetableEntry = typeof timetableEntriesTable.$inferSelect;
