/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from "http-status-codes";
import { envConfig } from "../../../config/env";
import ApiError from "../../errors/ApiError";
import * as gemini from "../../lib/gemini";
import * as openai from "../../lib/openai";

export type ChatMessage = gemini.ChatMessage;
export type ChatContext = gemini.ChatContext;

interface SaveChatMessageParams {
  userId: string;
  userMessage: string;
  assistantMessage: string;
  messageId: string;
}

interface SaveChatFeedbackParams {
  userId: string;
  messageId: string;
  feedback: "helpful" | "not_helpful";
  comment?: string;
}

/**
 * Stream chat response with fallback from Gemini to OpenAI
 */
export const streamChat = async (
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<AsyncIterable<string>> => {
  // Check which APIs are available
  const geminiAvailable = !!envConfig.GEMINI_API_KEY;
  const openaiAvailable = !!envConfig.OPENAI_API_KEY;

  if (!geminiAvailable && !openaiAvailable) {
    throw new ApiError(
      StatusCodes.SERVICE_UNAVAILABLE,
      "No AI service configured. Please set GEMINI_API_KEY or OPENAI_API_KEY.",
    );
  }

  try {
    // Try Gemini first if available (free tier)
    if (geminiAvailable) {
      console.log("🔄 Using Gemini API for chat");
      return await gemini.streamChatResponse(messages, context);
    }
  } catch (geminiError) {
    console.error("❌ Gemini API failed:", geminiError);

    // Fall back to OpenAI if Gemini fails and OpenAI is available
    if (openaiAvailable) {
      console.log("🔄 Falling back to OpenAI API");
      try {
        return await openai.streamChatResponse(messages, context);
      } catch (e: any) {
        console.log(e);
        throw new ApiError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "Both Gemini and OpenAI APIs failed. Please try again later.",
        );
      }
    }

    // If we reach here, Gemini failed and OpenAI is not available
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to generate chat response: ${geminiError instanceof Error ? geminiError.message : "Unknown error"}`,
    );
  }

  // Only OpenAI is available
  try {
    console.log("🔄 Using OpenAI API for chat");
    return await openai.streamChatResponse(messages, context);
  } catch (error) {
    console.error("Chat streaming error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to generate chat response: ${errorMessage}`,
    );
  }
};

/**
 * Save chat message to database for history
 */
export const saveChatMessage = async ({
  userId,
  userMessage,
  assistantMessage,
  messageId,
}: SaveChatMessageParams) => {
  try {
    // Note: You might want to create a ChatMessage model in Prisma schema
    // For now, this is a placeholder for future implementation
    // You could store in a separate table or with User model

    return {
      id: messageId,
      userId,
      userMessage,
      assistantMessage,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to save chat message:", error);
    // Don't throw error - chat should work even if history save fails
  }
};

/**
 * Save user feedback on chat response
 */
export const saveChatFeedback = async ({
  userId,
  messageId,
  feedback,
  comment,
}: SaveChatFeedbackParams) => {
  try {
    // Similar to above - you might want to create a ChatFeedback model
    return {
      id: `feedback_${Date.now()}`,
      userId,
      messageId,
      feedback,
      comment,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Failed to save feedback:", error);
    // Don't throw error - feedback is optional
  }
};

/**
 * Get chat history for user
 */
export const getChatHistory = async (
  userId: string,
  limit = 50,
  offset = 0,
) => {
  try {
    // Placeholder for future implementation with ChatMessage model
    return {
      data: [],
      total: 0,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Failed to fetch chat history",
    );
  }
};
