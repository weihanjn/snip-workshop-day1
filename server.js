// Snip backend — tiny URL shortener, single-file Bun server, zero npm dependencies.

const PORT = Number(process.env.PORT) || 3000;

const BASE_URL =
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);

const PUBLIC_DIR = process.env.PUBLIC_DIR || null;

// code -> { code, url, hits, createdAt }
const links = new Map();

const BASE62 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function genCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += BASE62[Math.floor(Math.random() * BASE62.length)];
  }
  return code;
}

function uniqueCode() {
  let code;
  do {
    code = genCode();
  } while (links.has(code));
  return code;
}

function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toResponseShape(link) {
  return {
    code: link.code,
    url: link.url,
    shortUrl: `${BASE_URL}/${link.code}`,
    hits: link.hits,
    createdAt: link.createdAt,
  };
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
      ...(init.headers || {}),
    },
  });
}

async function serveStatic(pathname) {
  if (!PUBLIC_DIR) return null;

  let relativePath = pathname === "/" ? "/index.html" : pathname;
  // Prevent path traversal outside of PUBLIC_DIR.
  const safePath = relativePath.split("/").filter((seg) => seg !== "..").join("/");
  const filePath = `${PUBLIC_DIR}${safePath}`;

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file, { headers: { ...CORS_HEADERS } });
  }
  return null;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (pathname === "/api/links" && method === "POST") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 });
      }

      if (!body || !isValidHttpUrl(body.url)) {
        return json(
          { error: "url must be a valid http(s) URL" },
          { status: 400 }
        );
      }

      const code = uniqueCode();
      const link = {
        code,
        url: body.url,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);

      return json(toResponseShape(link), { status: 201 });
    }

    if (pathname === "/api/links" && method === "GET") {
      const all = Array.from(links.values()).map(toResponseShape);
      return json(all, { status: 200 });
    }

    // Static files take priority over same-named short codes.
    if (method === "GET") {
      const staticResponse = await serveStatic(pathname);
      if (staticResponse) return staticResponse;
    }

    if (method === "GET" && /^\/[^/]+$/.test(pathname)) {
      const code = pathname.slice(1);
      const link = links.get(code);
      if (!link) {
        return json({ error: "Not found" }, { status: 404 });
      }
      link.hits += 1;
      return new Response(null, {
        status: 302,
        headers: { Location: link.url, ...CORS_HEADERS },
      });
    }

    return json({ error: "Not found" }, { status: 404 });
  },
});

console.log(`Snip backend listening on port ${server.port} (BASE_URL=${BASE_URL})`);
