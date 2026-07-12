import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeCache from "node-cache";
import fs from "fs";
import "dotenv/config";

const app = express();
const PORT = 3000;
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

// Support up to 50MB base64 images and videos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Ensure uploads directory exists and is served statically
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

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

// --- File Upload API ---
app.post("/api/upload", requireAuth, (req, res) => {
  try {
    const { filename, fileData } = req.body;
    if (!filename || !fileData) {
      return res.status(400).json({ error: "Неверный запрос: отсутствует имя файла или данные" });
    }

    // Extract raw base64 data from potential data URL prefix
    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let base64Data = fileData;
    if (matches && matches.length === 3) {
      base64Data = matches[2];
    }

    // Clean filename and make it unique
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFilename = `${Date.now()}_${cleanFilename}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    
    res.json({ url: `/uploads/${uniqueFilename}` });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Не удалось сохранить файл" });
  }
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
    const cachedStats = cache.get<any>("serverStats");
    let statsData: any = null;

    if (cachedStats) {
      statsData = { ...cachedStats };
    } else {
      const apiKey = process.env.FOREVER_HOST_API_KEY;
      if (!apiKey) {
        console.warn("Forever Host API key is missing, using fallback statistics");
        statsData = {
          accounts: 1457,
          levels: 520,
          rates: 0,
        };
      } else {
        try {
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

          statsData = {
            accounts: json.data.userCount || 0,
            levels: json.data.levelCount || 0,
            rates: 0,
          };
          cache.set("serverStats", statsData, 300); // 5 minutes cache for other stats
        } catch (err) {
          console.error("Error fetching live stats from API, using fallbacks:", err);
          statsData = {
            accounts: 1457,
            levels: 520,
            rates: 0,
          };
        }
      }
    }

    const db = readDB();
    const songsCount = typeof db.songs === "number" ? db.songs : 142;

    // Prepare combined response
    const combinedStats = {
      status: "success",
      accounts: statsData.accounts,
      levels: statsData.levels,
      rates: statsData.rates || 0,
      songs: songsCount,         // Backwards compatibility for Home.tsx
      songsCount: songsCount,    // As requested in the technical specification
    };

    res.json(combinedStats);
  } catch (error) {
    console.error("Error in server-stats route:", error);
    res.json({
      status: "success",
      accounts: 1457,
      levels: 520,
      rates: 0,
      songs: 142,
      songsCount: 142
    });
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
