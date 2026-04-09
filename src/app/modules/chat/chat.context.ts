/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";

export interface EnrichedChatContext {
  propertyCount?: number;
  userRole?: string;
  bookingCount?: number;
  userProperties?: Array<{
    id: string;
    title: string;
    location: string;
    price: number;
  }>;
  userBookings?: Array<{
    id: string;
    propertyId: string;
    status: string;
  }>;
  totalReviews?: number;
}

/**
 * Fetch enriched context data for the user to power the chatbot
 */
export const fetchUserContextData = async (
  userId: string,
  role?: string,
): Promise<EnrichedChatContext> => {
  try {
    // Fetch user's properties (if they are an agent/admin)
    let userProperties: any[] = [];
    if (role === "AGENT" || role === "ADMIN") {
      userProperties = await prisma.property.findMany({
        where: { agentId: userId },
        select: {
          id: true,
          title: true,
          location: true,
          price: true,
        },
        take: 2, // Limit to 2 recent properties to reduce payload size
        orderBy: { createdAt: "desc" },
      });
    }

    // Fetch user's bookings
    const userBookings = await prisma.bookingRequest.findMany({
      where: { agentId: userId },
      select: {
        id: true,
        propertyId: true,
        status: true,
      },
      take: 2, // Limit to 2 recent bookings - reduced for payload size
      orderBy: { createdAt: "desc" },
    });

    // Count total properties (if agent)
    const propertyCount = await prisma.property.count({
      where: { agentId: userId },
    });

    // Count total bookings
    const bookingCount = await prisma.bookingRequest.count({
      where: { agentId: userId },
    });

    // Count total reviews given by user
    const totalReviews = await prisma.review.count({
      where: { agentId: userId },
    });

    return {
      propertyCount: role === "AGENT" || role === "ADMIN" ? propertyCount : 0,
      userRole: role,
      bookingCount,
      userProperties: userProperties as any[],
      userBookings: userBookings as any,
      totalReviews,
    };
  } catch (error) {
    console.error("Error fetching user context:", error);
    // Return basic context if fetch fails
    return {
      userRole: role,
    };
  }
};

/**
 * Format context data into readable information for the system prompt
 */
export const formatContextForPrompt = (
  context: EnrichedChatContext,
): string => {
  let contextString = "";

  // Add user role-specific information
  if (context.userRole === "AGENT") {
    contextString += `Agent with ${context.propertyCount || 0} active properties`;

    if (context.userProperties && context.userProperties.length > 0) {
      contextString += ` | ${context.userProperties
        .slice(0, 2)
        .map((p) => `${p.title}`)
        .join(", ")}`;
    }
  } else if (context.userRole === "CUSTOMER") {
    contextString = `Customer with ${context.bookingCount || 0} booking(s)`;

    if (context.totalReviews && context.totalReviews > 0) {
      contextString += ` | ${context.totalReviews} review(s) written`;
    }
  } else if (context.userRole === "ADMIN") {
    contextString = `Admin user`;
  }

  return contextString || "Regular user";
};
