import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import menuHandler from "./api/menu.js";
import authHandler from "./api/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function createResponse(res) {
  let statusCode = 200;
  const headers = {};

  return {
    set statusCode(value) {
      statusCode = value;
    },
    get statusCode() {
      return statusCode;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
    end(body = "") {
      res.writeHead(statusCode, headers);
      res.end(body);
    },
  };
}

async function serveStatic(urlPath, res) {
  const safePath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(__dirname, safePath.replace(/^\//, ""));

  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/menu") {
    await menuHandler(req, createResponse(res));
    return;
  }

  if (url.pathname === "/api/auth") {
    await authHandler(req, createResponse(res));
    return;
  }

  await serveStatic(url.pathname, res);
});

server.listen(PORT, () => {
  console.log(`Dinner menu running at http://localhost:${PORT}`);
  console.log(`Admin editor at http://localhost:${PORT}/admin.html`);
});
