
import express from "express";

import {
  createSession,
  getAllSessions,
  getAllSessionsWithoutPagination,
  getSessionById,
  updateSession,
  deleteSession,
} from "../controllers/sessionController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All Session APIs require Admin authentication.
router.use(protect);

// ==========================================
// CREATE SESSION
// ==========================================

router.post("/", createSession);

// ==========================================
// GET ROUTES
// Keep static routes before /:id
// ==========================================

router.get("/all", getAllSessionsWithoutPagination);

router.get("/", getAllSessions);

router.get("/:id", getSessionById);

// ==========================================
// UPDATE SESSION
// ==========================================

router.put("/:id", updateSession);

// ==========================================
// DELETE SESSION
// ==========================================

router.delete("/:id", deleteSession);

export default router;
