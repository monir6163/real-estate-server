import { randomUUID } from "crypto";
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../lib/prisma";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
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

  // Set up streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const messageId = randomUUID();
    const stream = await streamChat(messages, {
      userRole: userRole || user.role,
    });

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
    console.error("Stream error:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`,
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

export { getChatHistoryHandler, saveChatFeedbackHandler, streamChatHandler };
