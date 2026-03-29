import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BookingRoutes } from "../modules/booking/booking.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { PropertyRoutes } from "../modules/property/property.routes";
import { ReviewRoutes } from "../modules/review/review.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/properties", PropertyRoutes);
router.use("/bookings", BookingRoutes);
router.use("/payments", PaymentRoutes);
router.use("/reviews", ReviewRoutes);

export const IndexRoutes = router;
