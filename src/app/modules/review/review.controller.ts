/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Role } from "../../../generated/prisma/enums";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const payload = {
    ...req.body,
    agentId: req.user?.id as string,
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
  const requesterRole = req.user?.role as Role;
  await reviewService.deleteReview(reviewId, agentId, requesterRole);

  sendResponse(res, {
    statusCode: StatusCodes.NO_CONTENT,
    success: true,
    message: "Review deleted successfully",
  });
});

const getReviewsByPropertyId = catchAsync(
  async (req: Request, res: Response) => {
    const propertyId = req.params.propertyId as string;
    const reviews = await reviewService.getReviewsByPropertyId(propertyId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Reviews retrieved successfully",
      data: reviews,
    });
  },
);

const getReviewByAgentAndProperty = catchAsync(
  async (req: Request, res: Response) => {
    const agentId = req.user?.id as string;
    const propertyId = req.query.propertyId as string;
    const review = await reviewService.getReviewByAgentAndProperty(
      agentId,
      propertyId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Review retrieved successfully",
      data: review,
    });
  },
);

const getReviewsByAgentId = catchAsync(async (req: Request, res: Response) => {
  const agentId = req.user?.id as string;
  const reviews = await reviewService.getReviewsByPropertyOwner(agentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: reviews,
  });
});

const getReviewsByUserId = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const reviews = await reviewService.getAllReviews();

  // Filter reviews submitted by this user (stored as agentId in current schema)
  const filteredReviews = reviews.filter((review: any) => {
    return review.agentId === userId;
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: filteredReviews,
  });
});

export const reviewController = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewsByPropertyId,
  getReviewByAgentAndProperty,
  getReviewsByAgentId,
  getReviewsByUserId,
};
