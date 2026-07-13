import { pgTable, serial, timestamp, integer, boolean, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const passengerRecordsTable = pgTable("passenger_records", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  driverId: integer("driver_id").notNull(),
  dutyId: integer("duty_id").notNull(),
  stopId: integer("stop_id").notNull(),
  timetableEntryId: integer("timetable_entry_id").notNull(),
  scheduledTime: timestamp("scheduled_time", { withTimezone: true }).notNull(),
  actualSubmissionTime: timestamp("actual_submission_time", { withTimezone: true }).notNull().defaultNow(),
  passengerCount: integer("passenger_count").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isLate: boolean("is_late").notNull().default(false),
  minutesLate: integer("minutes_late"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPassengerRecordSchema = createInsertSchema(passengerRecordsTable).omit({ id: true, createdAt: true, actualSubmissionTime: true, isLate: true, minutesLate: true });
export type InsertPassengerRecord = z.infer<typeof insertPassengerRecordSchema>;
export type PassengerRecord = typeof passengerRecordsTable.$inferSelect;
