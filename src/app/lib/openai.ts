import OpenAI from "openai";
import { envConfig } from "../../config/env";

// Check if OpenAI API key is configured
if (!envConfig.OPENAI_API_KEY) {
  console.error(
    "⚠️  WARNING: OPENAI_API_KEY is not set in environment variables!",
  );
}

const openaiClient = new OpenAI({
  apiKey: envConfig.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatContext {
  propertyCount?: number;
  userRole?: string;
  bookingCount?: number;
}

/**
 * Generate system prompt with context about the real estate platform
 */
export const generateSystemPrompt = (context?: ChatContext): string => {
  return `You are a helpful customer support assistant for a real estate platform. Your role is to help users with:
- Property search and recommendations
- Booking inquiries and management
- Payment and Stripe-related questions
- Account and profile management
- General questions about how to use the platform

${context?.userRole === "AGENT" ? "The user is a property agent/provider. You can help them with property listings, tenant inquiries, and booking management." : "The user is a customer/buyer. You can help them find properties, make bookings, and manage payments."}

Be concise, helpful, and professional. If the user asks about something outside your scope, politely redirect them to the email support team.
Keep responses under 300 words unless explicitly asked for more detail.`;
};

/**
 * Stream chat response from OpenAI
 */
export const streamChatResponse = async (
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<AsyncIterable<string>> => {
  try {
    console.log("🔵 OpenAI Request:", {
      model: "gpt-4o-mini",
      messagesCount: messages.length,
      context,
    });

    const stream = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Using cheaper model for streaming
      messages: [
        {
          role: "system",
          content: generateSystemPrompt(context),
        },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    });

    console.log("✅ Stream created successfully");

    // Return async generator
    return (async function* () {
      for await (const chunk of stream) {
        if (chunk.choices[0]?.delta?.content) {
          yield chunk.choices[0].delta.content;
        }
      }
    })();
  } catch (error) {
    console.error("❌ OpenAI API Error:", error);
    throw error;
  }
};

/**
 * Generate non-streaming chat response (for testing)
 */
export const generateChatResponse = async (
  messages: ChatMessage[],
  context?: ChatContext,
): Promise<string> => {
  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: generateSystemPrompt(context),
      },
      ...messages,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "";
};
