import { StatusCodes } from "http-status-codes";
import { Role } from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IReview } from "./review.interface";

const createReview = async (payload: IReview) => {
  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
  });

  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found.");
  }

  const review = await prisma.review.create({
    data: payload,
  });

  return review;
};

const getAllReviews = async (propertyId?: string) => {
  const reviews = await prisma.review.findMany({
    where: propertyId ? { propertyId } : undefined,
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews;
};

const getReviewById = async (id: string) => {
  const review = await prisma.review.findUnique({
    where: { id },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
  });

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found.");
  }

  return review;
};

const updateReview = async (
  id: string,
  agentId: string,
  payload: Partial<Pick<IReview, "rating" | "comment">>,
) => {
  const existingReview = await prisma.review.findUnique({
    where: { id },
  });

  if (!existingReview) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found.");
  }

  if (existingReview.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to update this review.",
    );
  }

  const review = await prisma.review.update({
    where: { id },
    data: payload,
  });

  return review;
};

const deleteReview = async (id: string, agentId: string, role: Role) => {
  const existingReview = await prisma.review.findUnique({
    where: { id },
  });

  if (!existingReview) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found.");
  }

  if (role !== Role.ADMIN && existingReview.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to delete this review.",
    );
  }

  await prisma.review.delete({
    where: { id },
  });
};

// get reviews for a specific property
const getReviewsByPropertyId = async (propertyId: string) => {
  const reviews = await prisma.review.findMany({
    where: { propertyId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews;
};

// get review for user and property
const getReviewByAgentAndProperty = async (
  agentId: string,
  propertyId: string,
) => {
  const review = await prisma.review.findFirst({
    where: { agentId, propertyId },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return review;
};

const getReviewsByPropertyOwner = async (ownerId: string) => {
  const reviews = await prisma.review.findMany({
    where: {
      property: {
        agentId: ownerId,
      },
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return reviews;
};

export const reviewService = {
  createReview,
  getAllReviews,
  getReviewById,
  updateReview,
  deleteReview,
  getReviewsByPropertyId,
  getReviewByAgentAndProperty,
  getReviewsByPropertyOwner,
};
