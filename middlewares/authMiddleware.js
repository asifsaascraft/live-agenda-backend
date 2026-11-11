
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";
import { errorResponse } from "../utils/response.js";

// ==========================================
// PROTECT ROUTES
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

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id).select(
      "name email role createdAt"
    );

    if (!user) {
      return errorResponse(res, {
        statusCode: 401,
        message: "User account not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return errorResponse(res, {
      statusCode: 401,
      message:
        error.name === "TokenExpiredError"
          ? "Access token expired."
          : "Invalid access token.",
    });
  }
});

// ==========================================
// ROLE-BASED AUTHORIZATION
// ==========================================

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, {
        statusCode: 401,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(res, {
        statusCode: 403,
        message: "You do not have permission to access this resource.",
      });
    }

    next();
  };
};
