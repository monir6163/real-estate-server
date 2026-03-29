import { prisma } from "../../lib/prisma";
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

export const PropertyService = {
  createProperty,
};
