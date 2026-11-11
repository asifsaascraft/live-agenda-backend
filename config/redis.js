
import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

redisClient.on("connect", () => {
  console.log("Redis connecting...");
});

redisClient.on("ready", () => {
  console.log("Redis connected successfully.");
});

redisClient.on("error", (error) => {
  console.error("Redis Error:", error.message);
});

redisClient.on("reconnecting", () => {
  console.log("Redis reconnecting...");
});

export const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error("Redis connection failed:", error.message);
    throw error;
  }
};

export default redisClient;
