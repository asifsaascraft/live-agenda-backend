
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";

import asyncHandler from "../utils/asyncHandler.js";

import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

import { generateTokens } from "../utils/generateTokens.js";

import hashToken from "../utils/hashToken.js";

import {
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
} from "../utils/cookies.js";

import sendEmail from "../utils/sendEmail.js";

// ==========================================
// HELPER: VALIDATE EMAIL
// ==========================================

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ==========================================
// HELPER: ISSUE ADMIN TOKENS
// ==========================================

const issueTokens = async (admin, res) => {
  const { accessToken, refreshToken } = generateTokens(
    admin._id
  );

  admin.refreshTokenHash = hashToken(refreshToken);

  await admin.save();

  setRefreshTokenCookie(res, refreshToken);

  return accessToken;
};

// ==========================================
// HELPER: VALIDATE ADMIN SETUP KEY
// ==========================================

const isValidSetupKey = (providedKey, configuredKey) => {
  if (
    typeof providedKey !== "string" ||
    typeof configuredKey !== "string" ||
    !providedKey ||
    !configuredKey
  ) {
    return false;
  }

  const providedBuffer = Buffer.from(providedKey);
  const configuredBuffer = Buffer.from(configuredKey);

  if (providedBuffer.length !== configuredBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    providedBuffer,
    configuredBuffer
  );
};

// ==========================================
// 1. SETUP ADMIN
// POST /api/auth/setup
// One-time operation
// ==========================================

export const setupAdmin = asyncHandler(async (req, res) => {
  const setupKey = req.get("x-admin-setup-key");

  const configuredKey = process.env.ADMIN_SETUP_KEY;

  if (!configuredKey) {
    return errorResponse(res, {
      statusCode: 503,
      message: "Admin setup is not configured.",
    });
  }

  if (!isValidSetupKey(setupKey, configuredKey)) {
    return errorResponse(res, {
      statusCode: 403,
      message: "Invalid admin setup key.",
    });
  }

  const { name, email, password } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return errorResponse(res, {
      statusCode: 400,
      message: "Name, email and password are required.",
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

  if (!isValidEmail(normalizedEmail)) {
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

  // Check whether the single admin already exists.

  const existingAdmin = await Admin.findById("primary-admin");

  if (existingAdmin) {
    return errorResponse(res, {
      statusCode: 409,
      message: "Admin account has already been initialized.",
    });
  }

  // Create the only permitted admin document.
  // MongoDB's unique _id prevents concurrent duplicate setup.

  try {
    const admin = await Admin.create({
      name: normalizedName,
      email: normalizedEmail,
      password,
    });

    return successResponse(res, {
      statusCode: 201,
      message: "Admin account created successfully. Please login.",
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          createdAt: admin.createdAt,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, {
        statusCode: 409,
        message: "Admin account has already been initialized.",
      });
    }

    throw error;
  }
});

// ==========================================
// 2. ADMIN LOGIN
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

  const admin = await Admin.findOne({
    email: normalizedEmail,
  }).select("+password");

  if (!admin) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }

  const isPasswordValid = await admin.matchPassword(password);

  if (!isPasswordValid) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid email or password.",
    });
  }

  const accessToken = await issueTokens(admin, res);

  return successResponse(res, {
    statusCode: 200,
    message: "Admin login successful.",
    data: {
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
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

    const admin = await Admin.findById(decoded.id).select(
      "+refreshTokenHash"
    );

    if (
      !admin ||
      !admin.refreshTokenHash ||
      admin.refreshTokenHash !== oldHash
    ) {
      clearRefreshTokenCookie(res);

      return errorResponse(res, {
        statusCode: 401,
        message: "Refresh token is invalid or has been revoked.",
      });
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
    } = generateTokens(admin._id);

    const newHash = hashToken(newRefreshToken);

    // Atomic refresh token rotation.

    const updatedAdmin = await Admin.findOneAndUpdate(
      {
        _id: admin._id,
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

    if (!updatedAdmin) {
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
// 4. ADMIN LOGOUT
// POST /api/auth/logout
// ==========================================

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    let decoded;

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );
    } catch (error) {
      // Invalid or expired token: clear the cookie below.
    }

    if (decoded && decoded.id === "primary-admin") {
      await Admin.updateOne(
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
    }
  }

  clearRefreshTokenCookie(res);

  return successResponse(res, {
    statusCode: 200,
    message: "Admin logout successful.",
  });
});

// ==========================================
// 5. GET ADMIN PROFILE
// GET /api/auth/me
// ==========================================

export const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, {
    statusCode: 200,
    message: "Admin profile fetched successfully.",
    data: {
      admin: {
        id: req.admin._id,
        name: req.admin.name,
        email: req.admin.email,
        createdAt: req.admin.createdAt,
      },
    },
  });
});

// ==========================================
// 6. FORGOT ADMIN PASSWORD
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

    if (!isValidEmail(normalizedEmail)) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Please enter a valid email address.",
      });
    }

    const admin = await Admin.findOne({
      email: normalizedEmail,
    });

    const genericMessage =
      "If an account exists with this email, a password reset link will be sent.";

    // Do not reveal whether the email belongs to the admin.

    if (!admin) {
      return successResponse(res, {
        statusCode: 200,
        message: genericMessage,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.passwordResetToken = hashToken(resetToken);

    admin.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await admin.save();

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      admin.passwordResetToken = null;
      admin.passwordResetExpires = null;
      await admin.save();

      throw new Error("FRONTEND_URL is missing.");
    }

    const resetUrl =
      `${frontendUrl.replace(/\/+$/, "")}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendEmail({
        to: admin.email,
        name: admin.name,
        subject: "Live Agenda - Admin Password Reset",
        templateKey: process.env.PASSWORD_RESET_TEMPLATE_KEY,
        mergeInfo: {
          name: admin.name,
          reset_url: resetUrl,
          expiry_time: "15 minutes",
        },
      });
    } catch (error) {
      admin.passwordResetToken = null;
      admin.passwordResetExpires = null;

      await admin.save();

      throw error;
    }

    return successResponse(res, {
      statusCode: 200,
      message: genericMessage,
    });
  }
);

// ==========================================
// 7. RESET ADMIN PASSWORD
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

    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select(
      "+passwordResetToken +passwordResetExpires +refreshTokenHash"
    );

    if (!admin) {
      return errorResponse(res, {
        statusCode: 400,
        message: "Invalid or expired password reset token.",
      });
    }

    admin.password = password;

    admin.passwordResetToken = null;
    admin.passwordResetExpires = null;

    // Revoke the existing refresh token after password reset.

    admin.refreshTokenHash = null;

    await admin.save();

    return successResponse(res, {
      statusCode: 200,
      message: "Admin password reset successful. Please login again.",
    });
  }
);
