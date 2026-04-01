import { StatusCodes } from "http-status-codes";
import { envConfig } from "../../../config/env";
import { Prisma } from "../../../generated/prisma/client";
import {
  PaymentStatus,
  PropertyStatus,
  RequestStatus,
  Role,
} from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { IBooking } from "./booking.interface";

const getCancellationWindowHours = () => {
  const parsed = Number(envConfig.BOOKING_CANCELLATION_WINDOW_HOURS ?? "24");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
};

const toInputJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const getPaymentIntentFromGatewayResponse = (gatewayResponse: unknown) => {
  if (!gatewayResponse || typeof gatewayResponse !== "object") {
    return null;
  }

  const possiblePaymentIntent = (gatewayResponse as Record<string, unknown>)
    .payment_intent;

  if (typeof possiblePaymentIntent === "string") {
    return possiblePaymentIntent;
  }

  if (
    possiblePaymentIntent &&
    typeof possiblePaymentIntent === "object" &&
    "id" in possiblePaymentIntent &&
    typeof (possiblePaymentIntent as { id?: unknown }).id === "string"
  ) {
    return (possiblePaymentIntent as { id: string }).id;
  }

  return null;
};

const getRawGatewayResponse = (gatewayResponse: unknown) => {
  if (gatewayResponse && typeof gatewayResponse === "object") {
    return gatewayResponse as Record<string, unknown>;
  }

  return {};
};

const createRefundForBookingPayment = async (payload: {
  transactionId?: string | null;
  paymentIntentId?: string | null;
  bookingId: string;
  paymentId: string;
}) => {
  let paymentIntentId = payload.paymentIntentId ?? null;

  if (!paymentIntentId && payload.transactionId) {
    const session = await stripe.checkout.sessions.retrieve(
      payload.transactionId,
    );

    if (typeof session.payment_intent === "string") {
      paymentIntentId = session.payment_intent;
    } else if (
      session.payment_intent &&
      typeof session.payment_intent === "object" &&
      "id" in session.payment_intent &&
      typeof session.payment_intent.id === "string"
    ) {
      paymentIntentId = session.payment_intent.id;
    }
  }

  if (!paymentIntentId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Unable to process refund for this booking payment.",
    );
  }

  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    metadata: {
      bookingId: payload.bookingId,
      paymentId: payload.paymentId,
    },
  });
};

const createBooking = async (payload: IBooking) => {
  const existingBooking = await prisma.bookingRequest.findUnique({
    where: {
      agentId_propertyId: {
        agentId: payload.agentId,
        propertyId: payload.propertyId,
      },
    },
  });

  if (existingBooking) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "A booking already exists for this agent and property.",
    );
  }
  const booking = await prisma.bookingRequest.create({
    data: {
      agentId: payload.agentId,
      propertyId: payload.propertyId,
      status: payload.status,
      message: payload.message,
      visitDate: payload.visitDate,
    },
  });
  return booking;
};

const getMyBookings = async (agentId: string) => {
  const bookings = await prisma.bookingRequest.findMany({
    where: {
      agentId,
    },
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
  return bookings;
};

const getBookingById = async (bookingId: string) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      property: true,
      payment: true,
    },
  });
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }
  return booking;
};

const updateBookingStatus = async (
  bookingId: string,
  status: RequestStatus,
  agentId: string,
) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: {
      id: bookingId,
    },
  });
  const property = await prisma.property.findUnique({
    where: {
      id: booking?.propertyId,
    },
  });
  if (property?.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to update the status of this booking.",
    );
  }
  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  if (
    status === RequestStatus.APPROVED &&
    booking.visitDate &&
    booking.visitDate.getTime() > Date.now()
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You can approve this booking only after the visit date has passed.",
    );
  }

  const updatedBooking = await prisma.bookingRequest.update({
    where: {
      id: bookingId,
    },
    data: {
      status,
    },
  });
  // also update Property status if booking is approved
  if (status === RequestStatus.APPROVED) {
    await prisma.property.update({
      where: {
        id: booking.propertyId,
      },
      data: {
        status: PropertyStatus.RENTED,
      },
    });
    // also update all other pending bookings for the same property to rejected
    await prisma.bookingRequest.updateMany({
      where: {
        propertyId: booking.propertyId,
        status: RequestStatus.PENDING,
      },
      data: {
        status: RequestStatus.REJECTED,
      },
    });

    // also payment status to completed for the approved booking
    await prisma.payment.updateMany({
      where: {
        bookingId: bookingId,
        status: "PENDING",
      },
      data: {
        status: PaymentStatus.SUCCESS,
      },
    });
  }
  return updatedBooking;
};

const removeBookingAndPayment = async (bookingId: string, userId: string) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      payment: true,
    },
  });

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  if (booking.agentId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to cancel this booking.",
    );
  }

  if (booking.status === RequestStatus.CANCELLATION_REQUESTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Cancellation has already been requested for this booking.",
    );
  }

  if (booking.status === RequestStatus.PENDING) {
    if (booking.payment?.status === PaymentStatus.SUCCESS) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Paid bookings cannot be cancelled from this action.",
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.deleteMany({
        where: {
          bookingId,
        },
      });

      await tx.bookingRequest.delete({
        where: {
          id: bookingId,
        },
      });
    });

    return { action: "CANCELLED" as const };
  }

  if (booking.status !== RequestStatus.APPROVED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "This booking cannot be cancelled.",
    );
  }

  if (booking.payment?.status !== PaymentStatus.SUCCESS) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only paid approved bookings can request cancellation.",
    );
  }

  const cancellationWindowHours = getCancellationWindowHours();
  const paidAt = booking.payment.updatedAt;
  const cancellationDeadline =
    paidAt.getTime() + cancellationWindowHours * 60 * 60 * 1000;

  if (Date.now() > cancellationDeadline) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Cancellation window expired. You can only request cancellation within ${cancellationWindowHours} hours after payment success.`,
    );
  }

  await prisma.bookingRequest.update({
    where: { id: booking.id },
    data: {
      status: RequestStatus.CANCELLATION_REQUESTED,
    },
  });

  return { action: "REQUESTED" as const };
};

const resolveCancellationRequest = async (
  bookingId: string,
  decision: "APPROVE" | "REJECT",
  actorId: string,
  actorRole?: Role,
) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      property: {
        select: {
          id: true,
          agentId: true,
        },
      },
    },
  });

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  if (!actorRole) {
    throw new ApiError(StatusCodes.FORBIDDEN, "User role is required.");
  }

  if (actorRole === Role.AGENT && booking.property.agentId !== actorId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to approve this cancellation request.",
    );
  }

  if (booking.status !== RequestStatus.CANCELLATION_REQUESTED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Booking is not waiting for cancellation approval.",
    );
  }

  if (!booking.payment || booking.payment.status !== PaymentStatus.SUCCESS) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Only paid bookings can be processed for refund approval.",
    );
  }

  if (decision === "REJECT") {
    const updatedBooking = await prisma.bookingRequest.update({
      where: { id: booking.id },
      data: {
        status: RequestStatus.APPROVED,
      },
    });

    return {
      decision,
      booking: updatedBooking,
      refunded: false,
    };
  }

  const paymentIntentId = getPaymentIntentFromGatewayResponse(
    booking.payment.gatewayResponse,
  );

  const refund = await createRefundForBookingPayment({
    bookingId: booking.id,
    paymentId: booking.payment.id,
    paymentIntentId,
    transactionId: booking.payment.transactionId,
  });
  const refundSnapshot = JSON.parse(JSON.stringify(refund)) as Record<
    string,
    unknown
  >;

  const rawGateway = getRawGatewayResponse(booking.payment.gatewayResponse);

  const updatedBooking = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: booking.payment!.id },
      data: {
        status: PaymentStatus.REFUNDED,
        gatewayResponse: toInputJson({
          ...rawGateway,
          refund: refundSnapshot,
        }),
      },
    });

    const cancelledBooking = await tx.bookingRequest.update({
      where: { id: booking.id },
      data: {
        status: RequestStatus.CANCELLED,
      },
    });

    const hasOtherApproved =
      (await tx.bookingRequest.count({
        where: {
          propertyId: booking.propertyId,
          status: RequestStatus.APPROVED,
          id: { not: booking.id },
        },
      })) > 0;

    if (!hasOtherApproved) {
      await tx.property.update({
        where: { id: booking.propertyId },
        data: {
          status: PropertyStatus.AVAILABLE,
        },
      });
    }

    return cancelledBooking;
  });

  return {
    decision,
    booking: updatedBooking,
    refunded: true,
    refundId: refund.id,
  };
};

const getAllBookings = async () => {
  const bookings = await prisma.bookingRequest.findMany({
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
  return bookings;
};

export const bookingService = {
  createBooking,
  getMyBookings,
  getBookingById,
  getAllBookings,
  updateBookingStatus,
  removeBookingAndPayment,
  resolveCancellationRequest,
};
