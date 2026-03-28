import { prisma } from "../../lib/prisma";
import { IProperty } from "./property.interface";

const createProperty = async (payload: IProperty) => {
  const result = await prisma.property.create({
    data: payload,
  });
  return result as IProperty;
};

export const PropertyService = {
  createProperty,
};
