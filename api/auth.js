import {
  jsonResponse,
  readJsonBody,
  safeCompare,
  signToken,
} from "../lib/auth.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "Method not allowed." });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    jsonResponse(res, 500, { error: "Admin password is not configured." });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    jsonResponse(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const password = body?.password;
  if (typeof password !== "string" || !password) {
    jsonResponse(res, 400, { error: "Password is required." });
    return;
  }

  if (!safeCompare(password, adminPassword)) {
    jsonResponse(res, 401, { error: "Incorrect password." });
    return;
  }

  const { token, expiresAt } = signToken();
  jsonResponse(res, 200, { token, expiresAt });
}
