import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import driversRouter from "./drivers";
import vehiclesRouter from "./vehicles";
import dutiesRouter from "./duties";
import stopsRouter from "./stops";
import timetablesRouter from "./timetables";
import passengerRecordsRouter from "./passengerRecords";
import gpsTrackingRouter from "./gpsTracking";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import usersRouter from "./users";
import auditLogRouter from "./auditLog";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(driversRouter);
router.use(vehiclesRouter);
router.use(dutiesRouter);
router.use(stopsRouter);
router.use(timetablesRouter);
router.use(passengerRecordsRouter);
router.use(gpsTrackingRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(usersRouter);
router.use(auditLogRouter);
router.use(settingsRouter);

export default router;
