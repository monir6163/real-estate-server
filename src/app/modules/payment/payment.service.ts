import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { envConfig } from "../../../config/env";
import { Prisma } from "../../../generated/prisma/client";
import { PaymentPurpose, PaymentStatus } from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";

const toInputJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const getFallbackBookingFeeAmount = () => {
  const amount = Number(envConfig.BOOKING_FEE_AMOUNT ?? "500");
  return Number.isFinite(amount) && amount > 0 ? amount : 500;
};

const getFallbackPremiumFeeAmount = () => {
  const amount = Number(envConfig.PREMIUM_LISTING_FEE_AMOUNT ?? "1000");
  return Number.isFinite(amount) && amount > 0 ? amount : 1000;
};

const getOrCreatePaymentSettings = async () => {
  const existing = await prisma.paymentSetting.findUnique({
    where: { id: "default" },
  });

  if (existing) {
    return existing;
  }

  return prisma.paymentSetting.create({
    data: {
      id: "default",
      bookingFeeAmount: getFallbackBookingFeeAmount(),
      premiumListingFeeAmount: getFallbackPremiumFeeAmount(),
      currency: envConfig.STRIPE_CURRENCY.toLowerCase(),
    },
  });
};

const getPaymentSettings = async () => {
  return getOrCreatePaymentSettings();
};

const updatePaymentSettings = async (payload: {
  bookingFeeAmount?: number;
  premiumListingFeeAmount?: number;
  currency?: string;
}) => {
  const current = await getOrCreatePaymentSettings();

  const bookingFeeAmount = payload.bookingFeeAmount ?? current.bookingFeeAmount;
  const premiumListingFeeAmount =
    payload.premiumListingFeeAmount ?? current.premiumListingFeeAmount;
  const currency = (payload.currency ?? current.currency).toLowerCase();

  if (!Number.isFinite(bookingFeeAmount) || bookingFeeAmount <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "bookingFeeAmount must be a positive number.",
    );
  }

  if (
    !Number.isFinite(premiumListingFeeAmount) ||
    premiumListingFeeAmount <= 0
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "premiumListingFeeAmount must be a positive number.",
    );
  }

  if (!/^[a-z]{3}$/.test(currency)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "currency must be a valid 3 letter code.",
    );
  }

  return prisma.paymentSetting.update({
    where: { id: "default" },
    data: {
      bookingFeeAmount,
      premiumListingFeeAmount,
      currency,
    },
  });
};

const createBookingCheckoutSession = async (
  agentId: string,
  bookingId: string,
) => {
  const booking = await prisma.bookingRequest.findUnique({
    where: { id: bookingId },
    include: { property: true },
  });

  if (!booking) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Booking not found.");
  }

  // if (booking.agentId !== agentId) {
  //   throw new ApiError(
  //     StatusCodes.FORBIDDEN,
  //     "You are not allowed to pay for this booking.",
  //   );
  // }

  const successfulPayment = await prisma.payment.findFirst({
    where: {
      bookingId,
      purpose: PaymentPurpose.BOOKING_FEE,
      status: PaymentStatus.SUCCESS,
    },
  });

  if (successfulPayment) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Booking payment has already been completed.",
    );
  }

  const settings = await getOrCreatePaymentSettings();
  const amount = settings.bookingFeeAmount;
  const currency = settings.currency.toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${envConfig.FRONTEND_URL.replace(/\/$/, "")}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envConfig.FRONTEND_URL.replace(/\/$/, "")}/payment/cancel?bookingId=${booking.id}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          product_data: {
            name: `Booking fee for ${booking.property.title}`,
          },
          unit_amount: Math.round(amount * 100),
        },
      },
    ],
    metadata: {
      purpose: PaymentPurpose.BOOKING_FEE,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      agentId,
    },
  });

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    update: {
      amount,
      purpose: PaymentPurpose.BOOKING_FEE,
      status: PaymentStatus.PENDING,
      transactionId: session.id,
      gatewayResponse: toInputJson(session),
    },
    create: {
      agentId,
      propertyId: booking.propertyId,
      bookingId: booking.id,
      amount,
      purpose: PaymentPurpose.BOOKING_FEE,
      status: PaymentStatus.PENDING,
      transactionId: session.id,
      gatewayResponse: toInputJson(session),
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

const createPremiumCheckoutSession = async (
  agentId: string,
  propertyId: string,
) => {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found.");
  }

  if (property.agentId !== agentId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not allowed to upgrade this property.",
    );
  }

  if (property.isPremium) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "This property is already premium.",
    );
  }

  const settings = await getOrCreatePaymentSettings();
  const amount = settings.premiumListingFeeAmount;
  const currency = settings.currency.toLowerCase();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: `${envConfig.FRONTEND_URL.replace(/\/$/, "")}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${envConfig.FRONTEND_URL.replace(/\/$/, "")}/payment/cancel?propertyId=${property.id}`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          product_data: {
            name: `Premium listing for ${property.title}`,
          },
          unit_amount: Math.round(amount * 100),
        },
      },
    ],
    metadata: {
      purpose: PaymentPurpose.PREMIUM_LISTING,
      propertyId: property.id,
      agentId,
    },
  });

  await prisma.payment.create({
    data: {
      agentId,
      propertyId: property.id,
      amount,
      purpose: PaymentPurpose.PREMIUM_LISTING,
      status: PaymentStatus.PENDING,
      transactionId: session.id,
      gatewayResponse: toInputJson(session),
    },
  });

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
};

const handleCompletedCheckoutSession = async (
  session: Stripe.Checkout.Session,
) => {
  const payment = await prisma.payment.findFirst({
    where: { transactionId: session.id },
  });

  if (!payment || payment.status === PaymentStatus.SUCCESS) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        gatewayResponse: toInputJson(session),
      },
    });

    if (payment.purpose === PaymentPurpose.PREMIUM_LISTING) {
      await tx.property.update({
        where: { id: payment.propertyId },
        data: { isPremium: true },
      });
    }
  });
};

const handleExpiredCheckoutSession = async (
  session: Stripe.Checkout.Session,
) => {
  const payment = await prisma.payment.findFirst({
    where: { transactionId: session.id },
  });

  if (!payment || payment.status === PaymentStatus.SUCCESS) {
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.FAILED,
      gatewayResponse: toInputJson(session),
    },
  });
};

const handleStripeWebhookEvent = async (event: Stripe.Event) => {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCompletedCheckoutSession(session);
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleExpiredCheckoutSession(session);
      break;
    }
    default:
      break;
  }
};

const getMyPayments = async (agentId: string) => {
  const payments = await prisma.payment.findMany({
    where: { agentId },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          thumbnail: true,
          isPremium: true,
        },
      },
      booking: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return payments;
};

export const paymentService = {
  createBookingCheckoutSession,
  createPremiumCheckoutSession,
  handleStripeWebhookEvent,
  getMyPayments,
  getPaymentSettings,
  updatePaymentSettings,
};
