import { Redis } from "ioredis";
import { loadEnv } from "../config/env.js";

/** Each caller gets its own connection — BullMQ's Worker/Queue and this rate limiter each
 *  want their own, and `maxRetriesPerRequest: null` is required for BullMQ's blocking ops. */
export function createRedisClient(): Redis {
  return new Redis(loadEnv().redisUrl, { maxRetriesPerRequest: null });
}
