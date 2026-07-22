import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeCache from "node-cache";
import fs from "fs";
import multer from "multer";
import "dotenv/config";
import { chromium, Browser, Page } from "playwright";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

app.use(express.json({ limit: "50mb" }));

const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;

let firebaseCredential;
let firebaseProjectId = FIREBASE_PROJECT_ID;

if (FIREBASE_SERVICE_ACCOUNT_JSON) {
  const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
  firebaseCredential = cert(serviceAccount);
  firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
  console.log("Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_JSON");
} else if (FIREBASE_SERVICE_ACCOUNT_PATH) {
  if (!fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
    console.error(`Firebase service account file not found at FIREBASE_SERVICE_ACCOUNT_PATH=${FIREBASE_SERVICE_ACCOUNT_PATH}`);
  } else {
    const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8"));
    firebaseCredential = cert(serviceAccount);
    firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
    console.log(`Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_PATH=${FIREBASE_SERVICE_ACCOUNT_PATH}`);
  }
}

if (!firebaseCredential) {
  console.log("Firebase service account not provided, using application default credentials");
  firebaseCredential = applicationDefault();
}

if (!getApps().length) {
  initializeApp({ credential: firebaseCredential, projectId: firebaseProjectId });
}

const db = getFirestore();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "image.png");
      cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  }
});

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOAD_DIR));

const DB_FILE = path.join(process.cwd(), "data.json");
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify({ songs: 0 }, null, 2)
  );
}

function readDB() {
  const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  if (typeof db.songs !== "number") db.songs = 0;
  return db;
}

function getSongCountFromDB() {
  const db = readDB();
  return typeof db.songs === "number" ? db.songs : 0;
}

async function fetchCollectionData(collectionName: string, orderByField?: string, orderDirection: "asc" | "desc" = "asc") {
  const collectionRef = db.collection(collectionName);
  const snapshot = orderByField
    ? await collectionRef.orderBy(orderByField, orderDirection).get()
    : await collectionRef.get();
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
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

app.post("/api/upload", requireAuth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Failed to upload image" });
    }

    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const safeName = path.basename(file.filename);
      res.json({ url: `/uploads/${safeName}` });
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });
});

// --- News API ---
app.get("/api/news", async (req, res) => {
  try {
    const newsItems = await fetchCollectionData("news", "date", "desc");
    res.json(newsItems);
  } catch (error) {
    console.error("Failed to fetch news from Firestore:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

app.post("/api/news", requireAuth, async (req, res) => {
  try {
    const newPost = { id: Date.now().toString(), ...req.body };
    await db.collection("news").doc(newPost.id).set(newPost);
    res.json(newPost);
  } catch (error) {
    console.error("Failed to save news to Firestore:", error);
    res.status(500).json({ error: "Failed to save news" });
  }
});

app.put("/api/news/:id", requireAuth, async (req, res) => {
  try {
    const docRef = db.collection("news").doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Not found" });
    }
    await docRef.update(req.body);
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error("Failed to update news in Firestore:", error);
    res.status(500).json({ error: "Failed to update news" });
  }
});

app.delete("/api/news/:id", requireAuth, async (req, res) => {
  try {
    await db.collection("news").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete news from Firestore:", error);
    res.status(500).json({ error: "Failed to delete news" });
  }
});

// --- Staff API ---
app.get("/api/staff", async (req, res) => {
  try {
    const staffItems = await fetchCollectionData("staff", "order", "asc");
    res.json(staffItems);
  } catch (error) {
    console.error("Failed to fetch staff from Firestore:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

app.post("/api/staff", requireAuth, async (req, res) => {
  try {
    const newStaff = { id: Date.now().toString(), ...req.body };
    await db.collection("staff").doc(newStaff.id).set(newStaff);
    res.json(newStaff);
  } catch (error) {
    console.error("Failed to save staff to Firestore:", error);
    res.status(500).json({ error: "Failed to save staff" });
  }
});

app.put("/api/staff/:id", requireAuth, async (req, res) => {
  try {
    const docRef = db.collection("staff").doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Not found" });
    }
    await docRef.update(req.body);
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error("Failed to update staff in Firestore:", error);
    res.status(500).json({ error: "Failed to update staff" });
  }
});

app.delete("/api/staff/:id", requireAuth, async (req, res) => {
  try {
    await db.collection("staff").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staff from Firestore:", error);
    res.status(500).json({ error: "Failed to delete staff" });
  }
});

// --- FAQ API ---
app.get("/api/faq", async (req, res) => {
  try {
    const faqItems = await fetchCollectionData("faq", "order", "asc");
    res.json(faqItems);
  } catch (error) {
    console.error("Failed to fetch FAQ from Firestore:", error);
    res.status(500).json({ error: "Failed to fetch FAQ" });
  }
});

app.post("/api/faq", requireAuth, async (req, res) => {
  try {
    const newFaq = { id: Date.now().toString(), ...req.body };
    await db.collection("faq").doc(newFaq.id).set(newFaq);
    res.json(newFaq);
  } catch (error) {
    console.error("Failed to save FAQ to Firestore:", error);
    res.status(500).json({ error: "Failed to save FAQ" });
  }
});

app.put("/api/faq/:id", requireAuth, async (req, res) => {
  try {
    const docRef = db.collection("faq").doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Not found" });
    }
    await docRef.update(req.body);
    const updatedDoc = await docRef.get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error("Failed to update FAQ in Firestore:", error);
    res.status(500).json({ error: "Failed to update FAQ" });
  }
});

app.delete("/api/faq/:id", requireAuth, async (req, res) => {
  try {
    await db.collection("faq").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete FAQ from Firestore:", error);
    res.status(500).json({ error: "Failed to delete FAQ" });
  }
});

// Proxy route for server stats
app.get("/api/server-stats", async (req, res) => {
  try {
    const songCount = getSongCountFromDB();
    const cachedStats = cache.get("serverStats");
    if (cachedStats) {
      const cachedData = cachedStats as any;
      return res.json({
        ...cachedData,
        songs: songCount,
      });
    }

    let accounts = 0;
    let levels = 0;

    const apiKey = process.env.FOREVER_HOST_API_KEY;
    if (apiKey) {
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

      accounts = json.data.userCount || 0;
      levels = json.data.levelCount || 0;
    }

    const data = {
      accounts,
      levels,
      rates: 0, // Not provided by this endpoint
      songs: songCount,
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
      songs: getSongCountFromDB(),
    });
  }
});

// --- GDPS Music Count API (Playwright Browser Automation) ---
/**
 * Scrapes the custom music count from the Forever Host control panel
 * Uses Playwright to emulate a real browser and handle authentication
 * Requires GDPS_USERNAME and GDPS_PASSWORD environment variables
 */
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"]
    });
  }
  return browser;
}

async function fetchGDPSMusicCount(): Promise<number | null> {
  let page: Page | null = null;
  try {
    const username = process.env.GDPS_USERNAME;
    const password = process.env.GDPS_PASSWORD;

    if (!username || !password) {
      console.warn("GDPS credentials missing: GDPS_USERNAME or GDPS_PASSWORD not set");
      return null;
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    console.log("Navigating to Forever Host panel...");
    
    // Navigate to the music list page
    await page.goto("https://n01.forever-host.xyz/0004/panel/music/list", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    // Check if we need to log in (look for login form)
    const loginFormExists = await page.locator("input[name='username'], input[name='user'], input[type='text']").first().isVisible().catch(() => false);

    if (loginFormExists) {
      console.log("Login form detected. Authenticating...");
      
      // Fill in the login form
      await page.fill("input[name='username'], input[name='user'], input[type='text']", username);
      await page.fill("input[name='password'], input[type='password']", password);

      // Submit the form
      await page.click("button[type='submit'], input[type='submit']");

      // Wait for navigation after login
      await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000); // Small delay to ensure page loads
    }

    // Wait for the music list to be visible
    const musicListSelector = "table tbody tr, .music-list li, [data-music-item], .music-item";
    await page.waitForSelector(musicListSelector, { timeout: 10000 }).catch(() => {});

    // Count the music entries
    const musicCount = await page.locator(musicListSelector).count();

    console.log(`Fetched GDPS music count: ${musicCount}`);
    return musicCount > 0 ? musicCount : null;
  } catch (error) {
    console.error("Error fetching GDPS music count:", error);
    return null;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
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
        details: "GDPS credentials not configured, connection failed, or music list not found"
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    const addr = server.address();
    const actualPort = typeof addr === "object" && addr !== null && "port" in addr ? addr.port : PORT;
    console.log(`Server running on port ${actualPort}`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    await closeBrowser();
    server.close(() => {
      console.log("Server closed");
      process.exit(0);
    });
  });
}

startServer();
