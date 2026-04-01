import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { paymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";

const router = Router();

router.post(
  "/checkout/booking",
  checkAuth(Role.USER),
  validateRequest(PaymentValidation.bookingCheckoutSchema),
  paymentController.createBookingCheckoutSession,
);

router.post(
  "/checkout/premium/:propertyId",
  checkAuth(Role.AGENT),
  validateRequest(PaymentValidation.premiumCheckoutSchema),
  paymentController.createPremiumCheckoutSession,
);

router.post(
  "/checkout/confirm/:sessionId",
  checkAuth(Role.USER, Role.AGENT),
  validateRequest(PaymentValidation.confirmCheckoutSchema),
  paymentController.confirmCheckoutSession,
);

router.get(
  "/my-payments",
  checkAuth(Role.USER, Role.AGENT),
  paymentController.getMyPayments,
);

router.get(
  "/settings",
  checkAuth(Role.ADMIN, Role.AGENT, Role.USER),
  paymentController.getPaymentSettings,
);

router.patch(
  "/settings",
  checkAuth(Role.AGENT),
  validateRequest(PaymentValidation.updateSettingsSchema),
  paymentController.updatePaymentSettings,
);

export const PaymentRoutes = router;
