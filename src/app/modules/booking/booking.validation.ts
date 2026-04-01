import * as z from "zod";
import { RequestStatus } from "../../../generated/prisma/enums";

export const BookingValidation = {
  bookingSchema: z.object({
    body: z.object({
      agentId: z.string(),
      propertyId: z.string(),
      status: z.nativeEnum(RequestStatus).default(RequestStatus.PENDING),
      message: z.string().optional(),
      visitDate: z.string().pipe(z.coerce.date()),
    }),
  }),
  updateStatusSchema: z.object({
    body: z.object({
      status: z.nativeEnum(RequestStatus),
    }),
  }),
  cancelDecisionSchema: z.object({
    body: z.object({
      decision: z.enum(["APPROVE", "REJECT"]),
    }),
  }),
};
