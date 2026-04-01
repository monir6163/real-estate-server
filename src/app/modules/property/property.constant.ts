import { Prisma } from "../../../generated/prisma/client";

export const propertySearchableFields = ["title", "description", "location"];

export const propertyFilterableFields = [
  "price",
  "bedrooms",
  "bathrooms",
  "location",
  "type",
  "listingType",
];

export const propertyIncludeConfig: Partial<
  Record<
    keyof Prisma.PropertyInclude,
    Prisma.PropertyInclude[keyof Prisma.PropertyInclude]
  >
> = {
  agent: true,
  propertyImages: true,
};
