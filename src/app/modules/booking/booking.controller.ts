import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { bookingService } from "./booking.service";

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const booking = await bookingService.createBooking(payload);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Booking created successfully",
    data: booking,
  });
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
  const agentId = req.user?.id as string;
  const bookings = await bookingService.getMyBookings(agentId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Bookings retrieved successfully",
    data: bookings,
  });
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;
  const booking = await bookingService.getBookingById(bookingId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Booking retrieved successfully",
    data: booking,
  });
});

const updateBookingStatus = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id as string;
  const { status } = req.body;
  const agentId = req.user?.id as string;
  const booking = await bookingService.updateBookingStatus(
    bookingId,
    status,
    agentId,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Booking status updated successfully",
    data: booking,
  });
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
  const bookings = await bookingService.getAllBookings();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "All bookings retrieved successfully",
    data: bookings,
  });
});

const removeBookingAndPayment = catchAsync(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id as string;
    const userId = req.user?.id as string;

    await bookingService.removeBookingAndPayment(bookingId, userId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Booking cancelled successfully",
      data: null,
    });
  },
);

export const bookingController = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  getAllBookings,
  removeBookingAndPayment,
};
