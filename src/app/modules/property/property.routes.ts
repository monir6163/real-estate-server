import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { PropertyController } from "./property.controller";
import { PropertyValidation } from "./property.validation";

const router = Router();

router.post(
  "/",
  validateRequest(PropertyValidation.propertyCreateSchema),
  checkAuth(Role.ADMIN, Role.AGENT),
  PropertyController.createProperty,
);

export const PropertyRoutes = router;
