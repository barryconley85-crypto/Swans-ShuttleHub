import { db, usersTable, driversTable, vehiclesTable, dutiesTable, stopsTable, timetableEntriesTable } from "@workspace/db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  // Vehicles
  const vehicles = await db.insert(vehiclesTable).values([
    { registration: "WP21 ABC", make: "Mercedes", model: "Sprinter", capacity: 16 },
    { registration: "WP21 DEF", make: "Ford", model: "Transit", capacity: 16 },
    { registration: "WP21 GHI", make: "Volkswagen", model: "Crafter", capacity: 17 },
  ]).onConflictDoNothing().returning();

  // Drivers
  const drivers = await db.insert(driversTable).values([
    { name: "John Smith", employeeNumber: "D001", vehicleId: vehicles[0]?.id },
    { name: "Sarah Jones", employeeNumber: "D002", vehicleId: vehicles[1]?.id },
    { name: "Mike Brown", employeeNumber: "D003", vehicleId: vehicles[2]?.id },
    { name: "Emma Wilson", employeeNumber: "D004" },
    { name: "James Taylor", employeeNumber: "D005" },
    { name: "Lucy Davis", employeeNumber: "D006" },
    { name: "Tom Harris", employeeNumber: "D007" },
    { name: "Anna White", employeeNumber: "D008" },
  ]).onConflictDoNothing().returning();

  // Duties (8 duties)
  const duties = await db.insert(dutiesTable).values([
    { name: "Duty 1", number: 1, description: "Morning route - Royal Well to Benhall" },
    { name: "Duty 2", number: 2, description: "Morning route - Arle Court to Royal Well" },
    { name: "Duty 3", number: 3, description: "Midday route" },
    { name: "Duty 4", number: 4, description: "Afternoon route" },
    { name: "Duty 5", number: 5, description: "Evening route" },
    { name: "Duty 6", number: 6, description: "Express route" },
    { name: "Duty 7", number: 7, description: "Weekend route A" },
    { name: "Duty 8", number: 8, description: "Weekend route B" },
  ]).onConflictDoNothing().returning();

  // Stops (real Cheltenham shuttle stops)
  const stops = await db.insert(stopsTable).values([
    { name: "Royal Well Bus Station", latitude: 51.9007, longitude: -2.0822, geofenceRadiusMeters: 150 },
    { name: "Benhall", latitude: 51.8921, longitude: -2.1012, geofenceRadiusMeters: 100 },
    { name: "Arle Court", latitude: 51.8997, longitude: -2.1156, geofenceRadiusMeters: 100 },
    { name: "Town Centre", latitude: 51.8994, longitude: -2.0783, geofenceRadiusMeters: 120 },
    { name: "Leckhampton", latitude: 51.8798, longitude: -2.0876, geofenceRadiusMeters: 100 },
  ]).onConflictDoNothing().returning();

  // Timetable entries for Duty 1
  if (duties[0] && stops.length >= 3) {
    await db.insert(timetableEntriesTable).values([
      { dutyId: duties[0].id, stopId: stops[0].id, scheduledTime: "07:00", sequenceOrder: 1, direction: "outbound" },
      { dutyId: duties[0].id, stopId: stops[1].id, scheduledTime: "07:20", sequenceOrder: 2, direction: "outbound" },
      { dutyId: duties[0].id, stopId: stops[2].id, scheduledTime: "07:40", sequenceOrder: 3, direction: "outbound" },
      { dutyId: duties[0].id, stopId: stops[0].id, scheduledTime: "08:00", sequenceOrder: 4, direction: "return" },
      { dutyId: duties[0].id, stopId: stops[1].id, scheduledTime: "08:20", sequenceOrder: 5, direction: "return" },
      { dutyId: duties[0].id, stopId: stops[2].id, scheduledTime: "08:40", sequenceOrder: 6, direction: "return" },
    ]).onConflictDoNothing();
  }

  // Timetable entries for Duty 2
  if (duties[1] && stops.length >= 3) {
    await db.insert(timetableEntriesTable).values([
      { dutyId: duties[1].id, stopId: stops[2].id, scheduledTime: "07:00", sequenceOrder: 1, direction: "outbound" },
      { dutyId: duties[1].id, stopId: stops[1].id, scheduledTime: "07:20", sequenceOrder: 2, direction: "outbound" },
      { dutyId: duties[1].id, stopId: stops[0].id, scheduledTime: "07:40", sequenceOrder: 3, direction: "outbound" },
      { dutyId: duties[1].id, stopId: stops[2].id, scheduledTime: "09:00", sequenceOrder: 4, direction: "return" },
      { dutyId: duties[1].id, stopId: stops[1].id, scheduledTime: "09:20", sequenceOrder: 5, direction: "return" },
    ]).onConflictDoNothing();
  }

  // Admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  await db.insert(usersTable).values({
    username: "admin",
    passwordHash: adminHash,
    role: "admin",
  }).onConflictDoNothing();

  // Driver users
  for (const driver of drivers.slice(0, 3)) {
    const hash = await bcrypt.hash("driver123", 12);
    await db.insert(usersTable).values({
      username: driver.name.toLowerCase().replace(" ", "."),
      passwordHash: hash,
      role: "driver",
      driverId: driver.id,
    }).onConflictDoNothing();
  }

  // Default settings

  console.log("Seed complete!");
  console.log("Admin login: admin / admin123");
  console.log("Driver login: john.smith / driver123");
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
