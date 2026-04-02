import express from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { userController } from "./user.controller";
import { UserValidation } from "./user.validation";

const router = express.Router();

router.get("/", checkAuth(Role.ADMIN), userController.getAllUsers);

router.patch(
  "/:id",
  checkAuth(Role.ADMIN),
  // validateRequest(UserValidation.updateRoleSchema),
  userController.updateUserStatus,
);

router.patch(
  "/profile/update",
  checkAuth(Role.USER, Role.AGENT, Role.ADMIN),
  validateRequest(UserValidation.updateProfileSchema),
  userController.updateProfile,
);

export const UserRoutes = router;
