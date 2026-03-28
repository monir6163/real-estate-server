import { Router } from "express";
import { multerUpload } from "../../../config/multer.config";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { PropertyController } from "./property.controller";
import { PropertyValidation } from "./property.validation";

const router = Router();

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.AGENT),
  multerUpload.single("file"),
  validateRequest(PropertyValidation.propertyCreateSchema),
  PropertyController.createProperty,
);

export const PropertyRoutes = router;
