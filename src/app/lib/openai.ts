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
