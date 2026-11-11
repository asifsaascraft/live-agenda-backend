
import jwt from "jsonwebtoken";

export const generateTokens = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is missing.");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is missing.");
  }

  const accessToken = jwt.sign(
    {
      id: userId.toString(),
      role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES || "15m",
    }
  );

  const refreshToken = jwt.sign(
    {
      id: userId.toString(),
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
