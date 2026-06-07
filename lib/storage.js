import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MENU_KEY } from "./constants.js";
import { readSeedMenu } from "./auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const livePath = path.join(__dirname, "..", "data", "menu.live.json");

let redisClient = null;

async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const { Redis } = await import("@upstash/redis");
  redisClient = Redis.fromEnv();
  return redisClient;
}

async function readLocalMenu() {
  try {
    const raw = await fs.readFile(livePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeLocalMenu(menu) {
  await fs.mkdir(path.dirname(livePath), { recursive: true });
  await fs.writeFile(livePath, JSON.stringify(menu, null, 2), "utf8");
}

function hasRedisConfig() {
  const upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  const kv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
  return Boolean(upstash || kv);
}

async function readRemoteMenu() {
  const redis = await getRedisClient();
  return redis.get(MENU_KEY);
}

async function writeRemoteMenu(menu) {
  const redis = await getRedisClient();
  await redis.set(MENU_KEY, menu);
}

async function tryReadRemoteMenu() {
  try {
    return await readRemoteMenu();
  } catch (error) {
    console.error("Redis read failed:", error);
    return null;
  }
}

export async function getMenu() {
  if (hasRedisConfig()) {
    const stored = await tryReadRemoteMenu();
    if (stored) {
      return stored;
    }
  } else {
    const stored = await readLocalMenu();
    if (stored) {
      return stored;
    }
  }

  return readSeedMenu();
}

export async function saveMenu(menu) {
  if (hasRedisConfig()) {
    await writeRemoteMenu(menu);
    return;
  }

  await writeLocalMenu(menu);
}

export async function seedMenuIfEmpty() {
  const seed = await readSeedMenu();

  if (hasRedisConfig()) {
    const existing = await tryReadRemoteMenu();
    if (!existing) {
      try {
        await writeRemoteMenu(seed);
      } catch (error) {
        console.error("Redis seed failed:", error);
      }
    }
    return;
  }

  const existing = await readLocalMenu();
  if (!existing) {
    await writeLocalMenu(seed);
  }
}
