
import express from "express";
import rateLimit from "express-rate-limit";

import {
  register,
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
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again later.",
    });
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
// AUTHENTICATION ROUTES
// ==========================================

// Register
router.post("/register", authLimiter, register);

// Login
router.post("/login", authLimiter, login);

// Refresh Token
router.post("/refresh-token", authLimiter, refreshAccessToken);

// Logout
router.post("/logout", logout);

// Get Logged-in User
router.get("/me", protect, getMe);

// Forgot Password
router.post(
  "/forgot-password",
  passwordResetLimiter,
  forgotPassword
);

// Reset Password
router.post(
  "/reset-password/:token",
  passwordResetLimiter,
  resetPassword
);

export default router;
