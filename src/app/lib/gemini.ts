import { GoogleGenAI } from "@google/genai";
import { envConfig } from "../../config/env";

const GEMINI_API_KEY = envConfig.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  console.log("✅ Gemini client initialized successfully");
} else {
  console.warn("⚠️  Gemini API key not configured");
}

// Helper function for exponential backoff retry
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  initialDelayMs = 1000,
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delayMs = initialDelayMs * Math.pow(2, i);
      console.warn(
        `⚠️  Attempt ${i + 1}/${maxRetries} failed. Retrying in ${delayMs}ms...`,
        lastError.message,
      );
      if (i < maxRetries - 1) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError;
};

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
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
  contextFormatted?: string;
}

/**
 * Generate system prompt with context about the real estate platform
 * Includes professional formatting instructions
 */
export const generateSystemPrompt = (context?: ChatContext): string => {
  const basePrompt = `You are a concise and efficient customer support assistant for a real estate platform.

${
  context?.contextFormatted
    ? `**USER CONTEXT:**\n${context.contextFormatted}`
    : ""
}

**YOUR ROLE:**
Help with property search, bookings, payments, account management, and reviews.

**RESPONSE RULES:**
- Be concise and direct (max 150 words unless asked for more)
- Use simple language and short sentences
- Answer the question immediately with actual data, then add details if needed
- Use bullet points for lists
- Don't ask unnecessary questions - provide helpful answers first
- If DATABASE SEARCH RESULTS are shown above, **ALWAYS USE THAT DATA TO ANSWER**
- For property/booking details, reference their specific data when relevant
- Keep a professional but friendly tone

**IF DATABASE SEARCH RESULTS ARE SHOWN:**
- **You have real property data - use it!**
- **Quote the exact price, location, and specifications from the results**
- **Do NOT ask user to search - you already have the results**
- **Provide direct answers like: "Found: [property name] in [location]. Price: [price]"**

**DO NOT:**
- Ask for unnecessary preference details
- Give long generic responses
- Include promotional or marketing content
- Provide information outside your scope

**AVAILABLE HELP:**
- Property search & filtering
- Booking management
- Payment & refund info
- Account settings
- Reviews & ratings`;

  return basePrompt;
};

/**
 * Format response text for professional presentation
 */
const formatResponse = (text: string): string => {
  if (!text) return text;

  // Clean up excessive whitespace
  let formatted = text.replace(/\n\n\n+/g, "\n\n").trim();

  // Ensure proper spacing around markdown headers
  formatted = formatted.replace(/([^\n])##\s/g, "$1\n\n## ");
  formatted = formatted.replace(/##\s([^\n]+)([^\n])/g, "## $1\n$2");

  // Improve spacing around bullet points
  formatted = formatted.replace(/([^\n])\n-\s/g, "$1\n\n- ");

  // Clean up numbered lists
  formatted = formatted.replace(/([^\n])\n\d+\.\s/g, "$1\n\n$&");

  // Add spacing between sentences if missing
  formatted = formatted.replace(/\.\s([A-Z])/g, ". $1");

  // Ensure ends with proper punctuation
  if (!/[.!?]$/.test(formatted.trim())) {
    formatted = formatted.trim() + ".";
  }

  return formatted;
};

/**
 * Stream chat response from Google Gemini with retry logic and professional formatting
 */
export const streamChatResponse = async (
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<AsyncIterable<string>> => {
  if (!ai) {
    throw new Error(
      "Gemini client is not available. Please ensure GEMINI_API_KEY is configured.",
    );
  }

  try {
    console.log("🔵 Gemini Request:", {
      model: "gemini-2.5-flash",
      messagesCount: messages.length,
      context,
    });

    // Extract the last user message
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === "user")?.content;

    if (!lastUserMessage) {
      throw new Error("No user message found in request");
    }

    // Build the prompt with system context
    const systemPrompt = generateSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser: ${lastUserMessage}`;

    console.log("✅ Stream request prepared");

    // Return async generator that streams content with retry logic
    return (async function* () {
      try {
        const response = await retryWithBackoff(
          () =>
            ai!.models.generateContent({
              model: "gemini-2.5-flash",
              contents: fullPrompt,
            }),
          3,
          1000,
        );

        const text = response.text;
        if (text) {
          // Format response for professional presentation
          const formattedText = formatResponse(text);

          // Yield content in chunks for streaming effect
          const chunkSize = 30;
          for (let i = 0; i < formattedText.length; i += chunkSize) {
            yield formattedText.slice(i, i + chunkSize);
          }
        }

        console.log("✅ Gemini stream completed successfully");
      } catch (error) {
        console.error("❌ Gemini Stream Error after retries:", error);
        // Return a user-friendly error message
        yield `Error: The AI service is currently overloaded. Please try again in a moment.`;
        throw error;
      }
    })();
  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    throw error;
  }
};

/**
 * Generate non-streaming chat response (for testing) with retry logic and professional formatting
 */
export const generateChatResponse = async (
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<string> => {
  if (!ai) {
    throw new Error(
      "Gemini client is not available. Please ensure GEMINI_API_KEY is configured.",
    );
  }

  const lastUserMessage = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user")?.content;

  if (!lastUserMessage) {
    throw new Error("No user message found in request");
  }

  // Build the prompt with system context
  const systemPrompt = generateSystemPrompt(context);
  const fullPrompt = `${systemPrompt}\n\nUser: ${lastUserMessage}`;

  const response = await retryWithBackoff(
    () =>
      ai!.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
      }),
    3,
    1000,
  );

  // Format response for professional presentation
  return formatResponse(response.text as string);
};

export default {
  generateSystemPrompt,
  streamChatResponse,
  generateChatResponse,
};
