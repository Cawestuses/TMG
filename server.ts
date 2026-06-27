import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeCache from "node-cache";
import fs from "fs";
import "dotenv/config";
import { load } from "cheerio";

const app = express();
const PORT = 3000;
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

app.use(express.json());

// --- Local Database Mock ---
const DB_FILE = path.join(process.cwd(), "data.json");
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ news: [], staff: [], faq: [] }, null, 2));
}

function readDB() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (!db.faq) db.faq = [];
  return db;
}

function writeDB(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- Admin Auth API ---
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin";

  if (username === adminUser && password === adminPass) {
    // Return a simple mock token
    res.json({ success: true, token: "admin-session-token-123" });
  } else {
    res.status(401).json({ error: "Неверный логин или пароль" });
  }
});

// Auth middleware for protected routes
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization;
  if (token === "Bearer admin-session-token-123") {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// --- News API ---
app.get("/api/news", (req, res) => {
  const db = readDB();
  // Sort descending by date
  const sorted = db.news.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(sorted);
});

app.post("/api/news", requireAuth, (req, res) => {
  const db = readDB();
  const newPost = { id: Date.now().toString(), ...req.body };
  db.news.push(newPost);
  writeDB(db);
  res.json(newPost);
});

app.put("/api/news/:id", requireAuth, (req, res) => {
  const db = readDB();
  const index = db.news.findIndex((p: any) => p.id === req.params.id);
  if (index !== -1) {
    db.news[index] = { ...db.news[index], ...req.body };
    writeDB(db);
    res.json(db.news[index]);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/api/news/:id", requireAuth, (req, res) => {
  const db = readDB();
  db.news = db.news.filter((p: any) => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- Staff API ---
app.get("/api/staff", (req, res) => {
  const db = readDB();
  // Sort ascending by order
  const sorted = db.staff.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  res.json(sorted);
});

app.post("/api/staff", requireAuth, (req, res) => {
  const db = readDB();
  const newStaff = { id: Date.now().toString(), ...req.body };
  db.staff.push(newStaff);
  writeDB(db);
  res.json(newStaff);
});

app.put("/api/staff/:id", requireAuth, (req, res) => {
  const db = readDB();
  const index = db.staff.findIndex((s: any) => s.id === req.params.id);
  if (index !== -1) {
    db.staff[index] = { ...db.staff[index], ...req.body };
    writeDB(db);
    res.json(db.staff[index]);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/api/staff/:id", requireAuth, (req, res) => {
  const db = readDB();
  db.staff = db.staff.filter((s: any) => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// --- FAQ API ---
app.get("/api/faq", (req, res) => {
  const db = readDB();
  const sorted = db.faq.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  res.json(sorted);
});

app.post("/api/faq", requireAuth, (req, res) => {
  const db = readDB();
  const newFaq = { id: Date.now().toString(), ...req.body };
  db.faq.push(newFaq);
  writeDB(db);
  res.json(newFaq);
});

app.put("/api/faq/:id", requireAuth, (req, res) => {
  const db = readDB();
  const index = db.faq.findIndex((f: any) => f.id === req.params.id);
  if (index !== -1) {
    db.faq[index] = { ...db.faq[index], ...req.body };
    writeDB(db);
    res.json(db.faq[index]);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.delete("/api/faq/:id", requireAuth, (req, res) => {
  const db = readDB();
  db.faq = db.faq.filter((f: any) => f.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// Proxy route for server stats
app.get("/api/server-stats", async (req, res) => {
  try {
    const cachedStats = cache.get("serverStats");
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const apiKey = process.env.FOREVER_HOST_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Forever Host API key is missing" });
    }

    // We assume the actual URL based on documentation. 
    // Usually it's something like /v1/servers/:id/stats or similar.
    // If it's a specific endpoint, adjust accordingly.
    const response = await fetch("https://api.forever-host.xyz/server/data?node=n01&gdpsid=0004", {
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    const json = await response.json();
    if (json.status !== "success" || !json.data) {
       throw new Error(`API returned error: ${json.message || 'unknown'}`);
    }

    const data = {
      accounts: json.data.userCount || 0,
      levels: json.data.levelCount || 0,
      rates: 0, // Not provided by this endpoint
      songs: 0, // Not provided by this endpoint
    };
    cache.set("serverStats", data);
    
    res.json(data);
  } catch (error) {
    console.error("Error fetching server stats:", error);
    // Fallback data on error
    res.json({
      accounts: 0,
      levels: 0,
      rates: 0,
      songs: 0
    });
  }
});

// --- GDPS Music Count API (Web Scraping) ---
/**
 * Scrapes the custom music count from the Forever Host control panel
 * First authenticates with username/password, then parses the music list
 * Requires GDPS_USERNAME and GDPS_PASSWORD environment variables
 */
async function fetchGDPSMusicCount(): Promise<number | null> {
  try {
    const username = process.env.GDPS_USERNAME;
    const password = process.env.GDPS_PASSWORD;

    if (!username || !password) {
      console.warn("GDPS credentials missing: GDPS_USERNAME or GDPS_PASSWORD not set");
      return null;
    }

    // Step 1: Create a fetch instance with cookie jar simulation
    // We'll store cookies manually for this session
    let cookies = "";

    // Step 2: Authenticate and get session cookies
    const loginResponse = await fetch("https://n01.forever-host.xyz/0004/panel/music/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      redirect: "manual"
    });

    // Extract cookies from Set-Cookie headers
    const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      cookies = setCookieHeaders
        .map((cookie: string) => cookie.split(";")[0])
        .join("; ");
    }

    // Step 3: Fetch the music list page with authenticated session
    const listResponse = await fetch("https://n01.forever-host.xyz/0004/panel/music/list", {
      headers: {
        "Cookie": cookies,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!listResponse.ok) {
      throw new Error(`HTTP ${listResponse.status}: Failed to fetch music list page`);
    }

    const html = await listResponse.text();
    const $ = load(html);

    // Step 4: Parse the music count from the list
    // Count all table rows (excluding header) or list items
    let musicCount = 0;

    // Strategy 1: Count table body rows (most common for music list)
    const tableRows = $("table tbody tr").length;
    if (tableRows > 0) {
      musicCount = tableRows;
    }

    // Strategy 2: If no table, count list items
    if (musicCount === 0) {
      const listItems = $(".music-list li, [data-music-item], .music-item").length;
      if (listItems > 0) {
        musicCount = listItems;
      }
    }

    // Strategy 3: Look for text containing count like "Total: 42" or "Всего: 42"
    if (musicCount === 0) {
      const textContent = $.text();
      const countMatch = textContent.match(/(?:Всего|Total|Count|songs?)[\s\D]*?(\d+)/i);
      if (countMatch) {
        musicCount = parseInt(countMatch[1], 10);
      }
    }

    console.log(`Fetched GDPS music count: ${musicCount}`);
    return musicCount;
  } catch (error) {
    console.error("Error fetching GDPS music count:", error);
    return null;
  }
}

app.get("/api/gdps/music/count", async (req, res) => {
  try {
    // Check cache first
    const cacheKey = "gdpsMusicCount";
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      return res.json({ count: cachedCount, cached: true });
    }

    // Fetch fresh data
    const count = await fetchGDPSMusicCount();

    if (count === null) {
      return res.status(503).json({
        error: "Unable to fetch music count",
        details: "GDPS credentials not configured or connection failed"
      });
    }

    // Cache the result
    cache.set(cacheKey, count);

    res.json({ count, cached: false });
  } catch (error) {
    console.error("Error in /api/gdps/music/count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
