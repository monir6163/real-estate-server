import { StatusCodes } from "http-status-codes";
import {
  PaymentStatus,
  PropertyStatus,
  RequestStatus,
} from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { IBooking } from "./booking.interface";

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
};
