import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { fetchUserContextData, formatContextForPrompt } from "./chat.context";
import { formatPropertiesForChat, searchProperties } from "./chat.search";
import {
  getChatHistory,
  saveChatFeedback,
  saveChatMessage,
  streamChat,
} from "./chat.service";
import {
  GetChatHistorySchema,
  SaveChatFeedbackSchema,
  StreamChatRequestSchema,
} from "./chat.validation";

/**
 * Stream chat response
 * POST /api/v1/chat/stream
 */
const streamChatHandler = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;

  // Validate request
  const parseResult = StreamChatRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "Invalid request",
      data: parseResult.error.issues,
    });
  }

  const { messages, userRole } = parseResult.data;

  // Get user from database for context
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    return sendResponse(res, {
      statusCode: StatusCodes.NOT_FOUND,
      success: false,
      message: "User not found",
    });
  }

  // Fetch enriched user context data
  const enrichedContext = await fetchUserContextData(userId, user.role);
  let contextFormatted = formatContextForPrompt(enrichedContext);

  // Check if user is asking about properties - search database
  const lastUserMessage = messages[messages.length - 1];
  let hasSearchResults = false;

  if (lastUserMessage?.role === "user") {
    const userQuery = lastUserMessage.content.toLowerCase();
    console.log("📨 User query:", userQuery);

    // Keywords that suggest a property search
    const searchKeywords = [
      "property",
      "flat",
      "apartment",
      "house",
      "villa",
      "price",
      "location",
      "rent",
      "খোঁজ",
      "প্রপার্টি",
      "ফ্ল্যাট",
      "বাড়ি",
      "দাম",
      "এলাকা",
      "ঘর",
    ];

    const isPropertySearch = searchKeywords.some((keyword) =>
      userQuery.includes(keyword),
    );

    console.log("🔎 Is property search?", isPropertySearch);

    if (isPropertySearch && userQuery.length > 2) {
      try {
        console.log("🔍 SEARCHING PROPERTIES FOR:", userQuery);
        const searchedProperties = await searchProperties(userQuery, 2);
        console.log(
          "📊 Search returned:",
          searchedProperties?.length,
          "properties",
        );

        if (searchedProperties && searchedProperties.length > 0) {
          console.log("✅ FOUND PROPERTIES:", searchedProperties);
          hasSearchResults = true;
          const propertyInfo = formatPropertiesForChat(searchedProperties);
          console.log("📄 Formatted property info:", propertyInfo);
          // Limit property info to avoid payload issues
          const limitedInfo = propertyInfo.substring(0, 350);
          contextFormatted += `\n\n**DATABASE SEARCH RESULTS:**\n${limitedInfo}`;
        } else {
          console.log("❌ NO PROPERTIES FOUND IN DATABASE");
        }
      } catch (error) {
        console.error("❌ Property search error:", error);
      }
    }
  }

  console.log(
    "✓ Context formatted (length:",
    contextFormatted.length,
    ", results:",
    hasSearchResults,
    ")",
  );

  // Set up streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const messageId = randomUUID();

    // Limit context size to prevent payload issues
    const MAX_CONTEXT_LENGTH = 1000;
    const trimmedContext = contextFormatted.substring(0, MAX_CONTEXT_LENGTH);

    console.log(
      "📝 Starting chat stream with context length:",
      trimmedContext.length,
    );

    const stream = await streamChat(messages, {
      userRole: userRole || user.role,
      propertyCount: enrichedContext.propertyCount,
      bookingCount: enrichedContext.bookingCount,
      userProperties: enrichedContext.userProperties,
      userBookings: enrichedContext.userBookings,
      totalReviews: enrichedContext.totalReviews,
      contextFormatted: trimmedContext,
    });

    if (!stream) {
      throw new Error("Stream is null or undefined");
    }

    console.log("✅ Stream received, starting to parse chunks");

    let fullResponse = "";

    for await (const chunk of stream) {
      fullResponse += chunk;
      // Send data in Server-Sent Events format
      res.write(
        `data: ${JSON.stringify({ content: chunk, id: messageId })}\n\n`,
      );
    }

    // Send completion marker
    res.write(
      `data: ${JSON.stringify({ type: "complete", id: messageId })}\n\n`,
    );
    res.end();

    console.log("✅ Stream completed successfully");

    // Save chat message asynchronously (don't wait for it)
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === "user") {
      saveChatMessage({
        userId,
        userMessage: lastUserMessage.content,
        assistantMessage: fullResponse,
        messageId,
      }).catch((err) => console.error("Failed to save chat message:", err));
    }
  } catch (error) {
    console.error("❌ Stream error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to generate response. " + errorMessage })}\n\n`,
    );
    res.end();
  }
});

/**
 * Save chat feedback
 * POST /api/v1/chat/feedback
 */
const saveChatFeedbackHandler = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id as string;

    // Validate request
    const parseResult = SaveChatFeedbackSchema.safeParse(req.body);

    if (!parseResult.success) {
      return sendResponse(res, {
        statusCode: StatusCodes.BAD_REQUEST,
        success: false,
        message: "Invalid feedback data",
        data: parseResult.error.issues,
      });
    }

    const { messageId, feedback, comment } = parseResult.data;

    const result = await saveChatFeedback({
      userId,
      messageId,
      feedback,
      comment,
    });

    return sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Feedback saved successfully",
      data: result,
    });
  },
);

/**
 * Get chat history
 * GET /api/v1/chat/history
 */
const getChatHistoryHandler = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id as string;

    // Validate query parameters
    const parseResult = GetChatHistorySchema.safeParse(req.query);

    if (!parseResult.success) {
      return sendResponse(res, {
        statusCode: StatusCodes.BAD_REQUEST,
        success: false,
        message: "Invalid query parameters",
        data: parseResult.error.issues,
      });
    }

    const { limit, offset } = parseResult.data;

    const history = await getChatHistory(userId, limit, offset);

    return sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Chat history retrieved",
      data: history.data,
      meta: {
        total: history.total,
        page: Math.floor(history.offset / history.limit) + 1,
        limit: history.limit,
        totalPages: Math.ceil(history.total / history.limit),
      },
    });
  },
);

/**
 * Test endpoint - debug database properties
 * GET /api/v1/chat/test/properties
 */
const testPropertiesHandler = catchAsync(
  async (req: Request, res: Response) => {
    const { search } = req.query;

    try {
      if (search) {
        console.log("🔍 TEST SEARCH FOR:", search);
        const results = await searchProperties(String(search), 10);
        return sendResponse(res, {
          statusCode: StatusCodes.OK,
          success: true,
          message: `Found ${results.length} properties`,
          data: results,
        });
      }

      // Get all properties
      const allProperties = await prisma.property.findMany({
        select: {
          id: true,
          title: true,
          location: true,
          price: true,
          type: true,
          bedrooms: true,
          bathrooms: true,
        },
        take: 20,
      });

      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: `Found ${allProperties.length} total properties`,
        data: allProperties,
      });
    } catch (error) {
      console.error("Test handler error:", error);
      return sendResponse(res, {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        success: false,
        message: "Error fetching properties",
      });
    }
  },
);

export {
  getChatHistoryHandler,
  saveChatFeedbackHandler,
  streamChatHandler,
  testPropertiesHandler,
};
