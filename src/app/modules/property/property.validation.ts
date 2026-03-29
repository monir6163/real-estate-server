import * as z from "zod";
import {
  ListingType,
  PropertyStatus,
  PropertyType,
} from "../../../generated/prisma/enums";

export const PropertyValidation = {
  propertyCreateSchema: z.object({
    body: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(1, "Description is required"),
      price: z.number().positive("Price must be a positive number"),
      location: z.string().min(1, "Location is required"),
      address: z.string().optional(),
      bedrooms: z
        .number()
        .int()
        .nonnegative("Bedrooms must be a non-negative integer"),
      bathrooms: z
        .number()
        .int()
        .nonnegative("Bathrooms must be a non-negative integer"),
      area: z.number().positive("Area must be a positive number"),
      type: z.enum(
        [
          PropertyType.APARTMENT,
          PropertyType.HOUSE,
          PropertyType.COMMERCIAL,
          PropertyType.LAND,
        ],
        {
          message: "Invalid property type",
        },
      ),
      listingType: z.enum([ListingType.RENT, ListingType.SALE], {
        message: "Invalid listing type",
      }),
      status: z
        .enum(
          [
            PropertyStatus.AVAILABLE,
            PropertyStatus.RENTED,
            PropertyStatus.SOLD,
          ],
          {
            message: "Invalid property status",
          },
        )
        .default(PropertyStatus.AVAILABLE),
      isPremium: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
    }),
  }),
};
