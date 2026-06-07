import {
  getBearerToken,
  jsonResponse,
  readJsonBody,
  verifyToken,
} from "../lib/auth.js";
import { getMenu, saveMenu, seedMenuIfEmpty } from "../lib/storage.js";
import { normalizeMenu, validateMenu } from "../lib/validate.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method === "GET") {
    try {
      await seedMenuIfEmpty();
      const menu = await getMenu();
      jsonResponse(res, 200, menu);
    } catch (error) {
      console.error("GET /api/menu failed:", error);
      jsonResponse(res, 500, { error: "Unable to load menu." });
    }
    return;
  }

  if (req.method === "PUT") {
    const token = getBearerToken(req);
    if (!verifyToken(token)) {
      jsonResponse(res, 401, { error: "Unauthorized." });
      return;
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch {
      jsonResponse(res, 400, { error: "Invalid JSON body." });
      return;
    }

    const validation = validateMenu(body);
    if (!validation.ok) {
      jsonResponse(res, 400, { error: "Validation failed.", details: validation.errors });
      return;
    }

    try {
      const normalized = normalizeMenu(body);
      await saveMenu(normalized);
      jsonResponse(res, 200, { ok: true, updatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("PUT /api/menu failed:", error);
      jsonResponse(res, 500, { error: "Unable to save menu." });
    }
    return;
  }

  jsonResponse(res, 405, { error: "Method not allowed." });
}
