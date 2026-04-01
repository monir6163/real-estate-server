import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { envConfig } from "../../../config/env";
import { stripe } from "../../lib/stripe";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { paymentService } from "./payment.service";

const createBookingCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const agentId = req.user?.id as string;
    const payload = req.body as {
      propertyId: string;
      visitDate: string | Date;
      message?: string;
    };
    const result = await paymentService.createBookingCheckoutSession(
      agentId,
      payload,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Checkout session created successfully",
      data: result,
    });
  },
);

const createPremiumCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const agentId = req.user?.id as string;
    const propertyId = req.params.propertyId as string;
    const result = await paymentService.createPremiumCheckoutSession(
      agentId,
      propertyId,
    );

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Premium checkout session created successfully",
      data: result,
    });
  },
);

const confirmCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const sessionId = req.params.sessionId as string;
    const result = await paymentService.confirmCheckoutSession(sessionId);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payment session confirmed successfully",
      data: result,
    });
  },
);

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const agentId = req.user?.id as string;
  const result = await paymentService.getMyPayments(agentId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payments retrieved successfully",
    data: result,
  });
});

const getPaymentSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await paymentService.getPaymentSettings();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Payment settings retrieved successfully",
    data: result,
  });
});

const updatePaymentSettings = catchAsync(
  async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await paymentService.updatePaymentSettings(payload);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Payment settings updated successfully",
      data: result,
    });
  },
);

const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["stripe-signature"];

    if (!signature || Array.isArray(signature)) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .send("Missing stripe signature");
    }

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      envConfig.STRIPE_WEBHOOK_SECRET,
    );

    await paymentService.handleStripeWebhookEvent(event);

    return res.status(StatusCodes.OK).json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send(`Webhook Error: ${message}`);
  }
};

export const paymentController = {
  createBookingCheckoutSession,
  createPremiumCheckoutSession,
  confirmCheckoutSession,
  getMyPayments,
  getPaymentSettings,
  updatePaymentSettings,
  handleStripeWebhook,
};
