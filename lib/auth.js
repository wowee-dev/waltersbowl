import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { TOKEN_TTL_MS } from "./constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const padded = input + "=".repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function getSecret() {
  return process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || "dev-secret";
}

export function signToken() {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = base64UrlEncode(JSON.stringify({ role: "admin", exp: expiresAt }));
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${payload}`)
    .digest();
  const token = `${header}.${payload}.${base64UrlEncode(signature)}`;
  return { token, expiresAt };
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [header, payload, signature] = parts;
  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(`${header}.${payload}`)
    .digest();

  const actual = base64UrlDecode(signature);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
    return false;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload).toString("utf8"));
    if (!decoded.exp || Date.now() > decoded.exp) {
      return false;
    }
    return decoded.role === "admin";
  } catch {
    return false;
  }
}

export function safeCompare(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization;
  if (!header || typeof header !== "string") {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

export async function readSeedMenu() {
  const seedPath = path.join(__dirname, "..", "data", "menu.seed.json");
  const raw = await fs.readFile(seedPath, "utf8");
  return JSON.parse(raw);
}

export function jsonResponse(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}
