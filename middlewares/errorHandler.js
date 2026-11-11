
import { errorResponse } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {
  console.error("API Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error.";
  let errors = null;

  // ==========================================
  // MONGOOSE VALIDATION ERROR
  // ==========================================

  if (err.name === "ValidationError") {
    statusCode = 400;

    errors = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));

    message = "Validation failed.";
  }

  // ==========================================
  // DUPLICATE KEY ERROR
  // ==========================================

  if (err.code === 11000) {
    statusCode = 409;

    const field = Object.keys(err.keyValue || {})[0];

    message = `${field || "Field"} already exists.`;
  }

  // ==========================================
  // INVALID MONGODB OBJECT ID
  // ==========================================

  if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid resource ID.";
  }

  // ==========================================
  // JWT ERRORS
  // ==========================================

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid authentication token.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Authentication token expired.";
  }

  return errorResponse(res, {
    statusCode,
    message,
    errors,
  });
};

export default errorHandler;
