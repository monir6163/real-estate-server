import * as z from "zod";

export const ReviewValidation = {
  createReviewSchema: z.object({
    body: z.object({
      propertyId: z.string().min(1, "Property id is required"),
      rating: z
        .number()
        .int("Rating must be an integer")
        .min(1, "Rating must be at least 1")
        .max(5, "Rating can be at most 5"),
      comment: z.string().optional(),
    }),
  }),

  updateReviewSchema: z.object({
    body: z
      .object({
        rating: z
          .number()
          .int("Rating must be an integer")
          .min(1, "Rating must be at least 1")
          .max(5, "Rating can be at most 5")
          .optional(),
        comment: z.string().optional(),
      })
      .refine(
        (value) => value.rating !== undefined || value.comment !== undefined,
        {
          message: "At least one field is required to update",
        },
      ),
  }),
};
