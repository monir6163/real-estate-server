import { StatusCodes } from "http-status-codes";
import Stripe from "stripe";
import { envConfig } from "../../../config/env";
import { Prisma } from "../../../generated/prisma/client";
import {
  PaymentPurpose,
  PaymentStatus,
  PropertyStatus,
  RequestStatus,
} from "../../../generated/prisma/enums";
import ApiError from "../../errors/ApiError";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "ugx",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);

const toInputJson = (value: unknown): Prisma.InputJsonValue => {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const toStripeMinorAmount = (amountMajor: number, currency: string) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return Math.round(amountMajor);
  }

  return Math.round(amountMajor * 100);
};

const fromStripeMinorAmount = (amountMinor: number, currency: string) => {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())) {
    return amountMinor;
  }

  return amountMinor / 100;
};

const getFallbackBookingFeeAmount = () => {
  const amount = Number(envConfig.BOOKING_FEE_AMOUNT ?? "500");
  return Number.isFinite(amount) && amount > 0 ? amount : 500;
};

const getFallbackPremiumFeeAmount = () => {
  const amount = Number(envConfig.PREMIUM_LISTING_FEE_AMOUNT ?? "1000");
  return Number.isFinite(amount) && amount > 0 ? amount : 1000;
};

const normalizeVisitDate = (visitDate: string | Date) => {
  const parsedDate =
    visitDate instanceof Date ? visitDate : new Date(String(visitDate));

  if (Number.isNaN(parsedDate.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid visit date.");
  }

  return parsedDate;
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
  payload: {
    propertyId: string;
    visitDate: string | Date;
    message?: string;
  },
) => {
  const visitDate = normalizeVisitDate(payload.visitDate);

  const property = await prisma.property.findUnique({
    where: { id: payload.propertyId },
  });

  if (!property) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Property not found.");
  }

  if (property.status !== PropertyStatus.AVAILABLE) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "This property is not available for booking.",
    );
  }

  const existingBooking = await prisma.bookingRequest.findUnique({
    where: {
      agentId_propertyId: {
        agentId,
        propertyId: payload.propertyId,
      },
    },
    include: {
      payment: true,
    },
  });

  if (existingBooking?.payment?.status === PaymentStatus.SUCCESS) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "Booking payment has already been completed.",
    );
  }

  const settings = await getOrCreatePaymentSettings();
  const currency = settings.currency.toLowerCase();
  const amountMajor = Number(property.price);
  const amount = toStripeMinorAmount(amountMajor, currency);

  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Property price must be a positive amount.",
    );
  }

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
            name: `Payment for ${property.title}`,
          },
          unit_amount: amount,
        },
      },
    ],
    metadata: {
      purpose: PaymentPurpose.BOOKING_FEE,
      propertyId: payload.propertyId,
      agentId,
      visitDate: visitDate.toISOString(),
      message: (payload.message ?? "").slice(0, 500),
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
  const amount = settings.premiumListingFeeAmount; // Already in cents
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
          unit_amount: amount,
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
  const metadata = session.metadata ?? {};
  const purpose = metadata.purpose as PaymentPurpose | undefined;

  const payment = await prisma.payment.findFirst({
    where: { transactionId: session.id },
  });

  if (payment?.status === PaymentStatus.SUCCESS) {
    return;
  }

  if (!payment && purpose === PaymentPurpose.BOOKING_FEE) {
    const agentId = metadata.agentId;
    const propertyId = metadata.propertyId;
    const visitDateRaw = metadata.visitDate;
    const message = metadata.message || undefined;

    if (!agentId || !propertyId || !visitDateRaw) {
      return;
    }

    const visitDate = new Date(visitDateRaw);
    if (Number.isNaN(visitDate.getTime())) {
      return;
    }

    await prisma.$transaction(async (tx) => {
      const property = await tx.property.findUnique({
        where: { id: propertyId },
      });

      if (!property || property.status !== PropertyStatus.AVAILABLE) {
        return;
      }

      const existingBooking = await tx.bookingRequest.findUnique({
        where: {
          agentId_propertyId: {
            agentId,
            propertyId,
          },
        },
        include: {
          payment: true,
        },
      });

      if (existingBooking?.payment?.status === PaymentStatus.SUCCESS) {
        return;
      }

      const booking =
        existingBooking ??
        (await tx.bookingRequest.create({
          data: {
            agentId,
            propertyId,
            visitDate,
            message,
            status: RequestStatus.APPROVED,
          },
        }));

      const amountMinor = Number(session.amount_total ?? 0);
      const sessionCurrency = (session.currency ?? "usd").toLowerCase();
      const amount = fromStripeMinorAmount(amountMinor, sessionCurrency);

      if (!existingBooking?.payment) {
        await tx.payment.create({
          data: {
            agentId,
            propertyId,
            bookingId: booking.id,
            amount,
            purpose: PaymentPurpose.BOOKING_FEE,
            status: PaymentStatus.SUCCESS,
            transactionId: session.id,
            gatewayResponse: toInputJson(session),
          },
        });
      } else {
        await tx.payment.update({
          where: { id: existingBooking.payment.id },
          data: {
            amount,
            status: PaymentStatus.SUCCESS,
            transactionId: session.id,
            gatewayResponse: toInputJson(session),
          },
        });
      }

      await tx.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.RENTED },
      });

      await tx.bookingRequest.updateMany({
        where: {
          propertyId,
          status: RequestStatus.PENDING,
          id: { not: booking.id },
        },
        data: {
          status: RequestStatus.REJECTED,
        },
      });
    });

    return;
  }

  if (!payment) {
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

    if (payment.purpose === PaymentPurpose.BOOKING_FEE && payment.bookingId) {
      await tx.bookingRequest.update({
        where: { id: payment.bookingId },
        data: { status: RequestStatus.APPROVED },
      });

      await tx.property.update({
        where: { id: payment.propertyId },
        data: { status: PropertyStatus.RENTED },
      });

      await tx.bookingRequest.updateMany({
        where: {
          propertyId: payment.propertyId,
          status: RequestStatus.PENDING,
          id: { not: payment.bookingId },
        },
        data: {
          status: RequestStatus.REJECTED,
        },
      });
    }

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

const confirmCheckoutSession = async (sessionId: string) => {
  if (!sessionId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Session id is required.");
  }

  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    throw new ApiError(StatusCodes.NOT_FOUND, "Checkout session not found.");
  }

  if (session.payment_status !== "paid") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Payment is not completed for this session.",
    );
  }

  await handleCompletedCheckoutSession(session);

  return {
    sessionId: session.id,
    paymentStatus: session.payment_status,
  };
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
  confirmCheckoutSession,
  getMyPayments,
  getPaymentSettings,
  updatePaymentSettings,
};
