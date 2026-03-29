import * as z from "zod";

export const PaymentValidation = {
  bookingCheckoutSchema: z.object({
    params: z.object({
      bookingId: z.string().min(1, "Booking id is required"),
    }),
  }),

  premiumCheckoutSchema: z.object({
    params: z.object({
      propertyId: z.string().min(1, "Property id is required"),
    }),
  }),

  updateSettingsSchema: z.object({
    body: z
      .object({
        bookingFeeAmount: z.number().positive().optional(),
        premiumListingFeeAmount: z.number().positive().optional(),
        currency: z.string().min(3).max(3).optional(),
      })
      .refine(
        (value) =>
          value.bookingFeeAmount !== undefined ||
          value.premiumListingFeeAmount !== undefined ||
          value.currency !== undefined,
        {
          message: "At least one setting is required to update",
        },
      ),
  }),
};
