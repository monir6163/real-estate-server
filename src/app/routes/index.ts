import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.route";
import { BookingRoutes } from "../modules/booking/booking.routes";
import chatRouter from "../modules/chat/chat.routes";
import { PaymentRoutes } from "../modules/payment/payment.routes";
import { PropertyRoutes } from "../modules/property/property.routes";
import { ReviewRoutes } from "../modules/review/review.route";
import { UserRoutes } from "../modules/user/user.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);
router.use("/properties", PropertyRoutes);
router.use("/bookings", BookingRoutes);
router.use("/payments", PaymentRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/chat", chatRouter);

export const IndexRoutes = router;
