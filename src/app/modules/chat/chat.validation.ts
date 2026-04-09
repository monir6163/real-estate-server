import { z } from "zod";

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1, "Message cannot be empty"),
});

export const StreamChatRequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1, "At least one message is required"),
  userRole: z.enum(["USER", "AGENT", "ADMIN"]).optional(),
});

export const SaveChatFeedbackSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  feedback: z.enum(["helpful", "not_helpful"]),
  comment: z.string().max(500).optional(),
});

export const GetChatHistorySchema = z.object({
  limit: z.coerce.number().int().positive().default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type StreamChatRequest = z.infer<typeof StreamChatRequestSchema>;
export type SaveChatFeedback = z.infer<typeof SaveChatFeedbackSchema>;
export type GetChatHistory = z.infer<typeof GetChatHistorySchema>;
