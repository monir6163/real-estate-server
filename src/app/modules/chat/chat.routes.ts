import { Router } from "express";
import checkAuth from "../../middleware/Auth";
import {
  getChatHistoryHandler,
  saveChatFeedbackHandler,
  streamChatHandler,
} from "./chat.controller";

const chatRouter = Router();

/**
 * Chat streaming endpoint
 * Only authenticated users can access
 */
chatRouter.post("/stream", checkAuth(), streamChatHandler);

/**
 * Save feedback on chat responses
 */
chatRouter.post("/feedback", checkAuth(), saveChatFeedbackHandler);

/**
 * Get user's chat history
 */
chatRouter.get("/history", checkAuth(), getChatHistoryHandler);

export default chatRouter;
