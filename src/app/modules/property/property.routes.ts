import { Router } from "express";
import { multerUpload } from "../../../config/multer.config";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { PropertyController } from "./property.controller";
import { PropertyValidation } from "./property.validation";

const router = Router();

router.get("/featured", PropertyController.getAllFeaturedProperties);

router.get("/", PropertyController.getAllProperties);

router.get("/:id", PropertyController.getSingleProperty);

router.get(
  "/agent/properties",
  checkAuth(Role.AGENT),
  PropertyController.getOwnerProperties,
);

router.post(
  "/",
  checkAuth(Role.AGENT),
  multerUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  validateRequest(PropertyValidation.propertyCreateSchema),
  PropertyController.createProperty,
);

router.put(
  "/:id",
  checkAuth(Role.AGENT),
  multerUpload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "images", maxCount: 5 },
  ]),
  validateRequest(PropertyValidation.propertyUpdateSchema),
  PropertyController.updateProperty,
);

router.patch(
  "/status/:id",
  checkAuth(Role.AGENT),
  validateRequest(PropertyValidation.propertyStatusUpdateSchema),
  PropertyController.updatePropertyStatus,
);

router.patch(
  "/featured/:id",
  checkAuth(Role.ADMIN),
  PropertyController.isFeaturedProperty,
);

router.delete(
  "/:id",
  checkAuth(Role.ADMIN, Role.AGENT),
  PropertyController.deleteProperty,
);

router.get(
  "/agent/bookings",
  checkAuth(Role.AGENT),
  PropertyController.ownerBookings,
);

export const PropertyRoutes = router;
