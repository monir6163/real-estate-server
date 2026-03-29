import { Router } from "express";
import { multerUpload } from "../../../config/multer.config";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { PropertyController } from "./property.controller";
import { PropertyValidation } from "./property.validation";

const router = Router();

router.get("/", PropertyController.getAllProperties);

router.post(
  "/",
  checkAuth(Role.ADMIN, Role.AGENT),
  multerUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  validateRequest(PropertyValidation.propertyCreateSchema),
  PropertyController.createProperty,
);

export const PropertyRoutes = router;
