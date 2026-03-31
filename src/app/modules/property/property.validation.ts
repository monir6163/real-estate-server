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
      price: z.coerce.number().positive("Price must be a positive number"),
      location: z.string().min(1, "Location is required"),
      address: z.string().optional(),
      bedrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bedrooms must be a non-negative integer"),
      bathrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bathrooms must be a non-negative integer"),
      area: z.coerce.number().positive("Area must be a positive number"),
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
      isPremium: z.coerce.boolean().default(false),
      isFeatured: z.coerce.boolean().default(false),
    }),
  }),

  propertyUpdateSchema: z.object({
    body: z.object({
      title: z.string().min(1, "Title is required").optional(),
      description: z.string().min(1, "Description is required").optional(),
      price: z.coerce
        .number()
        .positive("Price must be a positive number")
        .optional(),
      location: z.string().min(1, "Location is required").optional(),
      address: z.string().optional(),
      bedrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bedrooms must be a non-negative integer")
        .optional(),
      bathrooms: z.coerce
        .number()
        .int()
        .nonnegative("Bathrooms must be a non-negative integer")
        .optional(),
      area: z.coerce
        .number()
        .positive("Area must be a positive number")
        .optional(),
      type: z
        .enum(
          [
            PropertyType.APARTMENT,
            PropertyType.HOUSE,
            PropertyType.COMMERCIAL,
            PropertyType.LAND,
          ],
          {
            message: "Invalid property type",
          },
        )
        .optional(),
      listingType: z
        .enum([ListingType.RENT, ListingType.SALE], {
          message: "Invalid listing type",
        })
        .optional(),
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
        .optional(),
      isPremium: z.coerce.boolean().optional(),
      isFeatured: z.coerce.boolean().optional(),
    }),
  }),

  propertyStatusUpdateSchema: z.object({
    body: z.object({
      status: z.enum(
        [PropertyStatus.AVAILABLE, PropertyStatus.RENTED, PropertyStatus.SOLD],
        {
          message: "Invalid property status",
        },
      ),
    }),
  }),
};
