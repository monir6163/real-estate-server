import express from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import { userController } from "./user.controller";

const router = express.Router();

router.get("/", checkAuth(Role.ADMIN), userController.getAllUsers);

router.patch("/:id", checkAuth(Role.ADMIN), userController.updateUserStatus);

router.patch(
  "/profile/update",
  checkAuth(Role.USER, Role.AGENT, Role.ADMIN),
  userController.updateProfile,
);

export const UserRoutes = router;
