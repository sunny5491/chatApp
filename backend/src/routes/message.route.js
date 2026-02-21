import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getMessages, getUsersForSidebar, sendMessage, deleteMessage } from "../controllers/message.controller.js";

const router = express.Router();

// Get all users for sidebar
router.get("/users", protectRoute, getUsersForSidebar);

// Get messages for a specific user
router.get("/:userId([a-f0-9]{24})", protectRoute, getMessages);

// Send message to a specific user
router.post("/send/:userId([a-f0-9]{24})", protectRoute, sendMessage);

// Delete a message (only sender can delete)
router.delete("/:messageId([a-f0-9]{24})", protectRoute, deleteMessage);

export default router;