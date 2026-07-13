import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dutiesTable = pgTable("duties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  number: integer("number").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDutySchema = createInsertSchema(dutiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDuty = z.infer<typeof insertDutySchema>;
export type Duty = typeof dutiesTable.$inferSelect;
