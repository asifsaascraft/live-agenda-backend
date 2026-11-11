
import jwt from "jsonwebtoken";

// ==========================================
// GENERATE ADMIN ACCESS & REFRESH TOKENS
// ==========================================

export const generateTokens = (adminId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing.");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is missing.");
  }

  if (!adminId) {
    throw new Error("Admin ID is required to generate tokens.");
  }

  // Access Token
  const accessToken = jwt.sign(
    {
      id: adminId.toString(),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES || "15m",
    }
  );

  // Refresh Token
  const refreshToken = jwt.sign(
    {
      id: adminId.toString(),
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
    }
  );

  return {
    accessToken,
    refreshToken,
  };
};

export default generateTokens;
