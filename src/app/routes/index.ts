import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BookingRoutes } from "../modules/booking/booking.routes";
import { PropertyRoutes } from "../modules/property/property.routes";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/properties", PropertyRoutes);
router.use("/bookings", BookingRoutes);

export const IndexRoutes = router;
