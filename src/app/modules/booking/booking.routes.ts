import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { bookingController } from "./booking.controller";
import { BookingValidation } from "./booking.validation";

const router = Router();

router.post(
  "/",
  checkAuth(Role.USER),
  validateRequest(BookingValidation.bookingSchema),
  bookingController.createBooking,
);

// get all bookings for admin
router.get("/admin", checkAuth(Role.ADMIN), bookingController.getAllBookings);

router.get(
  "/my-bookings",
  checkAuth(Role.USER),
  bookingController.getMyBookings,
);

router.get("/:id", checkAuth(Role.USER), bookingController.getBookingById);

router.patch(
  "/:id/status",
  checkAuth(Role.AGENT),
  validateRequest(BookingValidation.updateStatusSchema),
  bookingController.updateBookingStatus,
);

router.delete(
  "/:id",
  checkAuth(Role.USER),
  bookingController.removeBookingAndPayment,
);

router.patch(
  "/:id/cancel-decision",
  checkAuth(Role.ADMIN, Role.AGENT),
  validateRequest(BookingValidation.cancelDecisionSchema),
  bookingController.resolveCancellationRequest,
);

export const BookingRoutes = router;
