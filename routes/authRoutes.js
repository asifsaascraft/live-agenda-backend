
import express from "express";
import rateLimit from "express-rate-limit";

import {
  setupAdmin,
  login,
  refreshAccessToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// ==========================================
// AUTH RATE LIMITERS
// ==========================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again later.",
  },
});

// ==========================================
// ONE-TIME ADMIN SETUP
// POST /api/auth/setup
// ==========================================

router.post("/setup", authLimiter, setupAdmin);

// ==========================================
// ADMIN LOGIN
// POST /api/auth/login
// ==========================================

router.post("/login", authLimiter, login);

// ==========================================
// REFRESH ACCESS TOKEN
// POST /api/auth/refresh-token
// ==========================================

router.post(
  "/refresh-token",
  authLimiter,
  refreshAccessToken
);

// ==========================================
// ADMIN LOGOUT
// POST /api/auth/logout
// ==========================================

router.post("/logout", logout);

// ==========================================
// GET ADMIN PROFILE
// GET /api/auth/me
// ==========================================

router.get("/me", protect, getMe);

// ==========================================
// FORGOT ADMIN PASSWORD
// POST /api/auth/forgot-password
// ==========================================

router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPassword
);

// ==========================================
// RESET ADMIN PASSWORD
// POST /api/auth/reset-password/:token
// ==========================================

router.post(
  "/reset-password/:token",
  passwordResetLimiter,
  resetPassword
);

export default router;
