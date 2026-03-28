import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";

const router = Router();
router.get(
  "/me",
  checkAuth(Role.ADMIN, Role.AGENT, Role.USER),
  AuthController.getMe,
);
router.post(
  "/register",
  validateRequest(AuthValidation.patientRegistrationSchema),
  AuthController.register,
);

router.post(
  "/login",
  validateRequest(AuthValidation.patientLoginSchema),
  AuthController.login,
);

router.post(
  "/change-password",
  checkAuth(Role.ADMIN, Role.AGENT, Role.USER),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthController.changePassword,
);

router.post(
  "/logout",
  checkAuth(Role.ADMIN, Role.AGENT, Role.USER),
  AuthController.logOut,
);

router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPasswordSchema),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPasswordSchema),
  AuthController.resetPassword,
);

router.post(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmailSchema),
  AuthController.verifyEmail,
);

router.post(
  "/resend-verification-email",
  validateRequest(AuthValidation.resendVerificationEmailSchema),
  AuthController.resendVerificationEmail,
);
export const AuthRoutes = router;
