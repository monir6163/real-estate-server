import { Prisma, Property } from "../../../generated/prisma/client";
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
    })
    .dynamicInclude(propertyIncludeConfig)
    .paginate()
    .sort()
    .fields()
    .execute();
  return result;
};

export const PropertyService = {
  createProperty,
  getAllProperties,
};
