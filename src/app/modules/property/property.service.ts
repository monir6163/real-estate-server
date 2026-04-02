import { StatusCodes } from "http-status-codes";
import {
  Prisma,
  Property,
  PropertyStatus,
} from "../../../generated/prisma/client";
import ApiError from "../../errors/ApiError";
import { IQueryParams } from "../../helper/query.interface";
import { QueryBuilder } from "../../helper/Querybuilder";
import { prisma } from "../../lib/prisma";
import {
  propertyFilterableFields,
  propertyIncludeConfig,
  propertySearchableFields,
} from "./property.constant";
import { IProperty } from "./property.interface";

const createProperty = async (payload: IProperty) => {
  const { images, thumbnail, ...propertyData } = payload;
  const result = await prisma.property.create({
    data: {
      ...propertyData,
      thumbnail,
      propertyImages: {
        create: images?.map((image: string) => ({ url: image })),
      },
    },
  });
  return result;
};

const getAllProperties = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Property,
    Prisma.PropertyWhereInput,
    Prisma.PropertyInclude
  >(prisma.property, query, {
    searchableFields: propertySearchableFields,
    filterableFields: propertyFilterableFields,
  });
  const result = await queryBuilder
    .search()
    .filter()
    .include({
      agent: true,
      propertyImages: true,
      reviews: {
        select: {
          rating: true,
        },
      },
    })
    .dynamicInclude(propertyIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();
  return result;
};

const getSingleProperty = async (id: string) => {
  const result = await prisma.property.findUnique({
    where: { id },
    include: {
      agent: true,
      propertyImages: true,
      reviews: {
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });
  return result;
};

/*
1. updateProperty: can not update other agent's property, only owned property can be updated by agent, admin can update any property
2. updatePropertyStatus: only owned property can be updated by agent, admin can update any property
3. deleteProperty: only owned property can be deleted by agent, admin can delete any property

*/

const updateProperty = async (
  id: string,
  agentId: string,
  payload: Partial<IProperty>,
) => {
  const { images, thumbnail, ...propertyData } = payload;

  const existingProperty = await prisma.property.findUnique({
    where: { id },
  });

  if (!existingProperty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (existingProperty.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to update this property",
    );
  }
  const result = await prisma.property.update({
    where: {
      id: id,
      agentId: agentId,
    },
    data: {
      ...propertyData,
      thumbnail,
      propertyImages: {
        create: images?.map((image: string) => ({ url: image })),
      },
    },
  });
  return result;
};

const updatePropertyStatus = async (
  id: string,
  agentId: string,
  status: PropertyStatus,
) => {
  const existingProperty = await prisma.property.findUnique({
    where: { id },
  });

  if (!existingProperty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (existingProperty.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to update this property",
    );
  }
  const result = await prisma.property.update({
    where: {
      id: id,
      agentId: agentId,
    },
    data: {
      status,
    },
  });
  return result;
};

const deleteProperty = async (id: string, agentId: string) => {
  const existingProperty = await prisma.property.findUnique({
    where: { id },
  });

  if (!existingProperty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  if (existingProperty.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to delete this property",
    );
  }

  // jodi rent hoy tahole delete hobe na

  if (existingProperty.status === PropertyStatus.RENTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot delete a property that is currently rented",
    );
  }
  if (existingProperty.status === PropertyStatus.SOLD) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cannot delete a property that is currently sold",
    );
  }

  const result = await prisma.property.delete({
    where: {
      id: id,
      agentId: agentId,
    },
  });
  return result;
};

const isFeaturedProperty = async (id: string) => {
  const existingProperty = await prisma.property.findUnique({
    where: { id },
  });

  if (!existingProperty) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found");
  }

  const result = await prisma.property.update({
    where: { id },
    data: { isFeatured: !existingProperty.isFeatured },
  });
  return result;
};

const getAllFeaturedProperties = async (query: IQueryParams) => {
  const queryBuilder = new QueryBuilder<
    Property,
    Prisma.PropertyWhereInput,
    Prisma.PropertyInclude
  >(prisma.property, query, {
    searchableFields: propertySearchableFields,
    filterableFields: propertyFilterableFields,
  });
  const result = await queryBuilder
    .where({ isFeatured: true })
    .search()
    .filter()
    .include({
      agent: true,
      propertyImages: true,
      reviews: {
        select: {
          rating: true,
        },
      },
    })
    .dynamicInclude(propertyIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();
  return result;
};

const getOwnerProperties = async (agentId: string) => {
  const result = await prisma.property.findMany({
    where: { agentId },
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      propertyImages: true,
      reviews: true,
    },
  });
  return result;
};

const ownerBookings = async (agentId: string) => {
  const result = await prisma.bookingRequest.findMany({
    where: { property: { agentId } },
    orderBy: { createdAt: "desc" },
    include: {
      property: true,
      payment: true,
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });
  return result;
};

export const PropertyService = {
  createProperty,
  getAllProperties,
  getSingleProperty,
  updateProperty,
  updatePropertyStatus,
  deleteProperty,
  isFeaturedProperty,
  getAllFeaturedProperties,
  getOwnerProperties,
  ownerBookings,
};
