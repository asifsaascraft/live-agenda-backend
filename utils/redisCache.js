import redisClient from "../config/redis.js";

//==============================
// Get Cache
//==============================
export const getCache = async (key) => {
  const data = await redisClient.get(key);

  return data ? JSON.parse(data) : null;
};

//==============================
// Set Cache
//==============================
export const setCache = async (
  key,
  value,
  ttl = 3600,
) => {
  await redisClient.set(
    key,
    JSON.stringify(value),
    {
      EX: ttl,
    },
  );
};

//==============================
// Delete Cache
//==============================
export const deleteCache = async (key) => {
  await redisClient.del(key);
};

//==============================
// Delete Cache By Pattern
//==============================
export const deleteCacheByPattern = async (
  pattern,
) => {
  let cursor = "0";

  do {
    const result = await redisClient.scan(cursor, {
      MATCH: pattern,
      COUNT: 100,
    });

    cursor = result.cursor;

    if (result.keys.length) {
      await redisClient.del(result.keys);
    }
  } while (cursor !== "0");
};