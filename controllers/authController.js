
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import User from "../models/User.js";

import asyncHandler from "../utils/asyncHandler.js";
import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

import {
  generateTokens,
} from "../utils/generateTokens.js";

import hashToken from "../utils/hashToken.js";

import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookies.js";

import sendEmail from "../utils/sendEmail.js";

// ==========================================
// HELPER: ISSUE TOKENS
// ==========================================

const issueTokens = async (user, res) => {
  const { accessToken, refreshToken } = generateTokens(
    user._id,
    user.role
  );

  const refreshTokenHash = hashToken(refreshToken);

  user.refreshTokenHash = refreshTokenHash;

  await user.save();

  setRefreshTokenCookie(res, refreshToken);

  return accessToken;
};

// ==========================================
// 1. REGISTER
// POST /api/auth/register
// ==========================================

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Name, email and password are required.",
    });
  }

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    return errorResponse(res, {
      statusCode: 400,
      message: "Invalid input data.",
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedName.length < 2 || normalizedName.length > 100) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Name must be between 2 and 100 characters.",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Please enter a valid email address.",
    });
  }

  if (password.length < 8 || password.length > 128) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Password must be between 8 and 128 characters.",
    });
  }

  const existingUser = await User.findOne({
    email: normalizedEmail,
  });

  if (existingUser) {
    return errorResponse(res, {
      statusCode: 409,
      message: "An account with this email already exists.",
    });
  }

  // Never accept role from public registration input.

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    password,
  });

  const accessToken = await issueTokens(user, res);

  return successResponse(res, {
    statusCode: 201,
    message: "Registration successful.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    },
  });
});

// ==========================================
// 2. LOGIN
// POST /api/auth/login
// ==========================================

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Email and password are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!user) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }

  const isPasswordValid = await user.matchPassword(password);

  if (!isPasswordValid) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }

  const accessToken = await issueTokens(user, res);

  return successResponse(res, {
    statusCode: 200,
    message: "Login successful.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      accessToken,
    },
  });
});

// ==========================================
// 3. REFRESH ACCESS TOKEN
// POST /api/auth/refresh-token
// ==========================================

export const refreshAccessToken = asyncHandler(
  async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Refresh token is missing. Please login again.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch (error) {
      clearRefreshTokenCookie(res);

      return errorResponse(res, {
        statusCode: 401,
        message: "Invalid or expired refresh token. Please login again.",
      });
    }

    const oldHash = hashToken(refreshToken);

    const user = await User.findById(decoded.id).select(
      "+refreshTokenHash"
    );

    if (
      !user ||
      !user.refreshTokenHash ||
      user.refreshTokenHash !== oldHash
    ) {
      clearRefreshTokenCookie(res);

      return errorResponse(res, {
        statusCode: 401,
        message: "Refresh token is invalid or has been revoked.",
      });
    }

    const { accessToken, refreshToken: newRefreshToken } =
      generateTokens(user._id, user.role);

    const newHash = hashToken(newRefreshToken);

    // Atomic rotation: only one request can replace the old token.

    const updatedUser = await User.findOneAndUpdate(
      {
        _id: user._id,
        refreshTokenHash: oldHash,
      },
      {
        $set: {
          refreshTokenHash: newHash,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      clearRefreshTokenCookie(res);

      return errorResponse(res, {
        statusCode: 401,
        message: "Refresh token has already been used.",
      });
    }

    setRefreshTokenCookie(res, newRefreshToken);

    return successResponse(res, {
      statusCode: 200,
      message: "Access token refreshed successfully.",
      data: {
        accessToken,
      },
    });
  }
);

// ==========================================
// 4. LOGOUT
// POST /api/auth/logout
// ==========================================

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      await User.updateOne(
        {
          _id: decoded.id,
          refreshTokenHash: hashToken(refreshToken),
        },
        {
          $set: {
            refreshTokenHash: null,
          },
        }
      );
    } catch (error) {
      // Even an expired or invalid token should be cleared.
    }
  }

  clearRefreshTokenCookie(res);

  return successResponse(res, {
    statusCode: 200,
    message: "Logout successful.",
  });
});

// ==========================================
// 5. GET LOGGED-IN USER
// GET /api/auth/me
// ==========================================

export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, {
    statusCode: 200,
    message: "User profile fetched successfully.",
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    },
  });
});

// ==========================================
// 6. FORGOT PASSWORD
// POST /api/auth/forgot-password
// ==========================================

export const forgotPassword = asyncHandler(
  async (req, res) => {
    const { email } = req.body || {};

    if (typeof email !== "string" || !email.trim()) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    // Don't reveal whether an email is registered.

    const genericMessage =
      "If an account exists with this email, a password reset link will be sent.";

    if (!user) {
      return successResponse(res, {
        statusCode: 200,
        message: genericMessage,
      });
    }

    // Generate a secure random token.

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedResetToken = hashToken(resetToken);

    user.passwordResetToken = hashedResetToken;

    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL;

    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendEmail({
        to: user.email,
        name: user.name,
        subject: "Live Agenda - Password Reset",
        templateKey: process.env.PASSWORD_RESET_TEMPLATE_KEY,
        mergeInfo: {
          name: user.name,
          reset_url: resetUrl,
          expiry_time: "15 minutes",
        },
      });
    } catch (error) {
      // Remove unused reset token if email delivery fails.

      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      await user.save();

      throw error;
    }

    return successResponse(res, {
      statusCode: 200,
      message: genericMessage,
    });
  }
);

// ==========================================
// 7. RESET PASSWORD
// POST /api/auth/reset-password/:token
// ==========================================

export const resetPassword = asyncHandler(
  async (req, res) => {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!token || typeof token !== "string") {
      return errorResponse(res, {
        statusCode: 400,
        message: "Password reset token is required.",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const hashedToken = hashToken(token);

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select(
      "+passwordResetToken +passwordResetExpires"
    );

    if (!user) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid or expired password reset token.",
      });
    }

    user.password = password;

    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    // Revoke any existing refresh token after password reset.

    user.refreshTokenHash = null;

    await user.save();

    return successResponse(res, {
      statusCode: 200,
      message: "Password reset successful. Please login again.",
    });
  }
);
