
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";

import asyncHandler from "../utils/asyncHandler.js";

import { errorResponse } from "../utils/response.js";

// ==========================================
// PROTECT ADMIN ROUTES
// ==========================================

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Authentication required. Please login.",
    });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Access token is missing.",
    });
  }

  let decoded;

  // Verify JWT separately so database errors are not
  // incorrectly reported as authentication errors.

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return errorResponse(res, {
      statusCode: 401,
      message:
        error.name === "TokenExpiredError"
          ? "Access token expired. Please login again."
          : "Invalid access token.",
    });
  }

  if (
    !decoded.id ||
    decoded.id !== "primary-admin"
  ) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Invalid admin authentication token.",
    });
  }

  const admin = await Admin.findById(decoded.id).select(
    "name email createdAt"
  );

  if (!admin) {
    return errorResponse(res, {
      statusCode: 401,
      message: "Admin account not found.",
    });
  }

  req.admin = admin;

  next();
});
