import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    agentId: req.user?.id,
  };

  const review = await reviewService.createReview(payload);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Review created successfully",
    data: review,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const propertyId = req.query.propertyId as string | undefined;
  const reviews = await reviewService.getAllReviews(propertyId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: reviews,
  });
});

const getReviewById = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  const review = await reviewService.getReviewById(reviewId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Review retrieved successfully",
    data: review,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  const agentId = req.user?.id as string;
  const review = await reviewService.updateReview(reviewId, agentId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Review updated successfully",
    data: review,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  const agentId = req.user?.id as string;
  await reviewService.deleteReview(reviewId, agentId);

  sendResponse(res, {
    statusCode: StatusCodes.NO_CONTENT,
    success: true,
    message: "Review deleted successfully",
  });
});

export const reviewController = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
};
