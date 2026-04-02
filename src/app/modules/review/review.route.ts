import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import checkAuth from "../../middleware/Auth";
import validateRequest from "../../middleware/ValidateRequest";
import { reviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = Router();

router.get("/", reviewController.getAllReviews);

router.get(
  "/property/:propertyId",
  checkAuth(Role.AGENT),
  reviewController.getReviewsByPropertyId,
);

router.get(
  "/agent",
  checkAuth(Role.AGENT),
  reviewController.getReviewsByAgentId,
);

router.get("/user", checkAuth(Role.USER), reviewController.getReviewsByUserId);

router.get(
  "/my-reviews/:propertyId",
  checkAuth(Role.USER),
  reviewController.getReviewByAgentAndProperty,
);

router.get("/:id", reviewController.getReviewById);

router.post(
  "/",
  checkAuth(Role.USER),
  validateRequest(ReviewValidation.createReviewSchema),
  reviewController.createReview,
);

router.patch(
  "/:id",
  checkAuth(Role.USER),
  validateRequest(ReviewValidation.updateReviewSchema),
  reviewController.updateReview,
);

router.delete(
  "/:id",
  checkAuth(Role.USER, Role.ADMIN),
  reviewController.deleteReview,
);

export const ReviewRoutes = router;
