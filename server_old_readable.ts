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
import { getStorage } from "firebase-admin/storage";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache

app.use(express.json({ limit: "50mb" }));

const FIREBASE_SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const FIREBASE_SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;

let firebaseCredential;
let firebaseProjectId = FIREBASE_PROJECT_ID;
let hasServiceAccount = false;

if (FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    firebaseCredential = cert(serviceAccount);
    firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
    hasServiceAccount = true;
    console.log("Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_JSON");
  } catch (e) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
  }
} else if (FIREBASE_SERVICE_ACCOUNT_PATH) {
  if (fs.existsSync(FIREBASE_SERVICE_ACCOUNT_PATH)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(FIREBASE_SERVICE_ACCOUNT_PATH, "utf-8"));
      firebaseCredential = cert(serviceAccount);
      firebaseProjectId = serviceAccount.project_id || firebaseProjectId;
      hasServiceAccount = true;
      console.log(`Firebase credentials loaded from FIREBASE_SERVICE_ACCOUNT_PATH=${FIREBASE_SERVICE_ACCOUNT_PATH}`);
    } catch (e) {
      console.error(`Failed to load service account at ${FIREBASE_SERVICE_ACCOUNT_PATH}:`, e);
    }
  } else {
    console.warn(`Firebase service account file not found at FIREBASE_SERVICE_ACCOUNT_PATH=${FIREBASE_SERVICE_ACCOUNT_PATH}`);
  }
}

// BUCKET CONFIGURATION (.firebasestorage.app or .appspot.com)
const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || (firebaseProjectId ? `${firebaseProjectId}.firebasestorage.app` : undefined);

if (!getApps().length) {
  if (hasServiceAccount && firebaseCredential) {
    initializeApp({
      credential: firebaseCredential,
      projectId: firebaseProjectId,
      storageBucket: storageBucketName,
    });
  } else {
    let configProjectId = "tmg-site-3be52";
    if (fs.existsSync("./firebase-applet-config.json")) {
      try {
        const conf = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
        if (conf.projectId) configProjectId = conf.projectId;
      } catch (err) {}
    }
    try {
      initializeApp({
        credential: applicationDefault(),
        projectId: firebaseProjectId || configProjectId,
        storageBucket: storageBucketName,
      });
    } catch (err) {
      console.warn("Initializing default firebase app failed:", err);
    }
  }
}

let db: any = null;
let storageBucket: any = null;
try {
  db = getFirestore();
  const storage = getStorage();
  storageBucket = storage.bucket();
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ╨Ш╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╡╨╝ memoryStorage ╨┤╨╗╤П ╨╝╨│╨╜╨╛╨▓╨╡╨╜╨╜╨╛╨╣ ╨╖╨░╨│╤А╤Г╨╖╨║╨╕ ╨▓ Firebase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images are allowed"));
  }
});

const DB_FILE = path.join(process.cwd(), "data.json");

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = { songs: 142, news: [], staff: [], faq: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(content);
    if (typeof data.songs !== "number") data.songs = 142;
    if (!Array.isArray(data.news)) data.news = [];
    if (!Array.isArray(data.staff)) data.staff = [];
    if (!Array.isArray(data.faq)) data.faq = [];
    return data;
  } catch (err) {
    console.error("Error reading DB_FILE:", err);
    return { songs: 142, news: [], staff: [], faq: [] };
  }
}

function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing DB_FILE:", err);
  }
}

function getSongCountFromDB() {
  const dbData = readDB();
  return typeof dbData.songs === "number" ? dbData.songs : 142;
}

async function fetchCollectionData(collectionName: "news" | "staff" | "faq", orderByField?: string, orderDirection: "asc" | "desc" = "asc") {
  const localData = readDB();
  let items: any[] = localData[collectionName] || [];

  if (db && hasServiceAccount) {
    try {
      const collectionRef = db.collection(collectionName);
      const snapshot = orderByField
        ? await collectionRef.orderBy(orderByField, orderDirection).get()
        : await collectionRef.get();
      const firestoreItems = snapshot.docs.map((docSnapshot: any) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
      
      if (firestoreItems.length > 0) {
        items = firestoreItems;
        localData[collectionName] = firestoreItems;
        writeDB(localData);
      }
    } catch (error: any) {
      console.warn(`Firestore query for '${collectionName}' failed (${error.message || error}). Using local cache.`);
    }
  }

  if (orderByField && items.length > 0) {
    items = [...items].sort((a: any, b: any) => {
      const valA = a[orderByField];
      const valB = b[orderByField];
      if (valA < valB) return orderDirection === "asc" ? -1 : 1;
      if (valA > valB) return orderDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  return items;
}

async function saveDocToCollection(collectionName: "news" | "staff" | "faq", docData: any) {
  const localData = readDB();
  const list = localData[collectionName] || [];
  const idx = list.findIndex((item: any) => item.id === docData.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...docData };
  } else {
    list.push(docData);
  }
  localData[collectionName] = list;
  writeDB(localData);

  if (db && hasServiceAccount) {
    try {
      await db.collection(collectionName).doc(docData.id).set(docData, { merge: true });
    } catch (err: any) {
      console.warn(`Firestore setDoc for '${collectionName}/${docData.id}' skipped (${err.message || err}). Saved locally.`);
    }
  }

  return docData;
}

async function updateDocInCollection(collectionName: "news" | "staff" | "faq", id: string, docData: any) {
  const localData = readDB();
  const list = localData[collectionName] || [];
  const idx = list.findIndex((item: any) => item.id === id);
  if (idx < 0) {
    throw new Error("Not found");
  }
  const updated = { ...list[idx], ...docData, id };
  list[idx] = updated;
  localData[collectionName] = list;
  writeDB(localData);

  if (db && hasServiceAccount) {
    try {
      await db.collection(collectionName).doc(id).update(docData);
    } catch (err: any) {
      console.warn(`Firestore update for '${collectionName}/${id}' skipped (${err.message || err}). Updated locally.`);
    }
  }

  return updated;
}

async function deleteDocFromCollection(collectionName: "news" | "staff" | "faq", id: string) {
  const localData = readDB();
  let list = localData[collectionName] || [];
  list = list.filter((item: any) => item.id !== id);
  localData[collectionName] = list;
  writeDB(localData);

  if (db && hasServiceAccount) {
    try {
      await db.collection(collectionName).doc(id).delete();
    } catch (err: any) {
      console.warn(`Firestore delete for '${collectionName}/${id}' skipped (${err.message || err}). Deleted locally.`);
    }
  }

  return true;
}

// --- Admin Auth API ---
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  const adminUser = process.env.ADMIN_USERNAME || "admin";
  const adminPass = process.env.ADMIN_PASSWORD || "admin";

  if (username === adminUser && password === adminPass) {
    res.json({ success: true, token: "admin-session-token-123" });
  } else {
    res.status(401).json({ error: "╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ ╨╗╨╛╨│╨╕╨╜ ╨╕╨╗╨╕ ╨┐╨░╤А╨╛╨╗╤М" });
  }
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization;
  if (token === "Bearer admin-session-token-123") {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// --- Upload API (╨в╨╡╨┐╨╡╤А╤М ╨╖╨░╨│╤А╤Г╨╢╨░╨╡╤В ╨╜╨░╨┐╤А╤П╨╝╤Г╤О ╨▓ Firebase Storage) ---
app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || "Failed to upload image" });
    }

    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const destinationPath = `uploads/${safeName}`;

      // ╨Х╤Б╨╗╨╕ ╨┐╨╛╨┤╨║╨╗╤О╤З╨╡╨╜ Firebase Storage тАФ ╤Б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╤В╤Г╨┤╨░
      if (storageBucket) {
        const fileRef = storageBucket.file(destinationPath);
        await fileRef.save(file.buffer, {
          resumable: false,
          contentType: file.mimetype,
          metadata: {
            cacheControl: "public, max-age=31536000, immutable",
          },
        });
        console.log(`Uploaded ${safeName} to Firebase Storage`);
      }

      // ╨б╨╛╤Е╤А╨░╨╜╤П╨╡╨╝ ╨║╨╛╨┐╨╕╤О ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛ (╨┤╨╗╤П ╨▒╤Л╤Б╤В╤А╨╛╨╣ ╨╛╤В╨┤╨░╤З╨╕ ╨┤╨╛ ╨┐╨╡╤А╨▓╨╛╨│╨╛ ╤А╨╡╤Б╤В╨░╤А╤В╨░)
      const localFilePath = path.join(UPLOAD_DIR, safeName);
      fs.writeFileSync(localFilePath, file.buffer);

      // ╨Т╨╛╨╖╨▓╤А╨░╤Й╨░╨╡╨╝ ╨┐╤А╨╕╨▓╤Л╤З╨╜╤Л╨╣ ╨░╨┤╤А╨╡╤Б ╨▓╨╕╨┤╨░ /uploads/filename.png
      res.json({ url: `/uploads/${safeName}` });
    } catch (error) {
      console.error("Upload failed:", error);
      res.status(500).json({ error: "Failed to upload image" });
    }
  });
});

// --- ╨а╨╛╤Г╤В ╨╛╤В╨│╤А╤Г╨╖╨║╨╕ ╨╖╨░╨│╤А╤Г╨╢╨╡╨╜╨╜╤Л╤Е ╨║╨░╤А╤В╨╕╨╜╨╛╨║ (`/uploads/:filename`) ---
app.get("/uploads/:filename", async (req, res) => {
  const { filename } = req.params;
  const localPath = path.join(UPLOAD_DIR, filename);

  // 1. ╨Я╤А╨╛╨▓╨╡╤А╤П╨╡╨╝ ╨╜╨░╨╗╨╕╤З╨╕╨╡ ╤Д╨░╨╣╨╗╨░ ╨╜╨░ ╨╗╨╛╨║╨░╨╗╤М╨╜╨╛╨╝ ╨┤╨╕╤Б╨║╨╡
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }

  // 2. ╨Х╤Б╨╗╨╕ ╨┤╨╕╤Б╨║ ╨╛╤З╨╕╤Б╤В╨╕╨╗╤Б╤П (╨┐╨╛╤Б╨╗╨╡ ╤А╨╡╨┤╨╡╨┐╨╗╨╛╤П ╨╜╨░ Render) тАФ ╨╖╨░╨▒╨╕╤А╨░╨╡╨╝ ╨╕╨╖ Firebase Storage
  if (storageBucket) {
    try {
      const file = storageBucket.file(`uploads/${filename}`);
      const [exists] = await file.exists();
      if (exists) {
        const ext = path.extname(filename).toLowerCase();
        const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
        res.setHeader("Content-Type", contentType);
        return file.createReadStream().pipe(res);
      }
    } catch (err) {
      console.warn(`Failed to stream /uploads/${filename} from Storage:`, err);
    }
  }

  res.status(404).send("File not found");
});

// --- News API ---
app.get("/api/news", async (req, res) => {
  try {
    const newsItems = await fetchCollectionData("news", "date", "desc");
    res.json(newsItems);
  } catch (error) {
    console.error("Failed to fetch news:", error);
    res.json([]);
  }
});

app.post("/api/news", requireAuth, async (req, res) => {
  try {
    const newPost = { id: Date.now().toString(), ...req.body };
    const saved = await saveDocToCollection("news", newPost);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save news:", error);
    res.status(500).json({ error: "Failed to save news" });
  }
});

app.put("/api/news/:id", requireAuth, async (req, res) => {
  try {
    const updated = await updateDocInCollection("news", req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error?.message === "Not found") return res.status(404).json({ error: "Not found" });
    console.error("Failed to update news:", error);
    res.status(500).json({ error: "Failed to update news" });
  }
});

app.delete("/api/news/:id", requireAuth, async (req, res) => {
  try {
    await deleteDocFromCollection("news", req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete news:", error);
    res.status(500).json({ error: "Failed to delete news" });
  }
});

// --- Staff API ---
app.get("/api/staff", async (req, res) => {
  try {
    const staffItems = await fetchCollectionData("staff", "order", "asc");
    res.json(staffItems);
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    res.json([]);
  }
});

app.post("/api/staff", requireAuth, async (req, res) => {
  try {
    const newStaff = { id: Date.now().toString(), ...req.body };
    const saved = await saveDocToCollection("staff", newStaff);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save staff:", error);
    res.status(500).json({ error: "Failed to save staff" });
  }
});

app.put("/api/staff/:id", requireAuth, async (req, res) => {
  try {
    const updated = await updateDocInCollection("staff", req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error?.message === "Not found") return res.status(404).json({ error: "Not found" });
    console.error("Failed to update staff:", error);
    res.status(500).json({ error: "Failed to update staff" });
  }
});

app.delete("/api/staff/:id", requireAuth, async (req, res) => {
  try {
    await deleteDocFromCollection("staff", req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staff:", error);
    res.status(500).json({ error: "Failed to delete staff" });
  }
});

// --- FAQ API ---
app.get("/api/faq", async (req, res) => {
  try {
    const faqItems = await fetchCollectionData("faq", "order", "asc");
    res.json(faqItems);
  } catch (error) {
    console.error("Failed to fetch FAQ:", error);
    res.json([]);
  }
});

app.post("/api/faq", requireAuth, async (req, res) => {
  try {
    const newFaq = { id: Date.now().toString(), ...req.body };
    const saved = await saveDocToCollection("faq", newFaq);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save FAQ:", error);
    res.status(500).json({ error: "Failed to save FAQ" });
  }
});

app.put("/api/faq/:id", requireAuth, async (req, res) => {
  try {
    const updated = await updateDocInCollection("faq", req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    if (error?.message === "Not found") return res.status(404).json({ error: "Not found" });
    console.error("Failed to update FAQ:", error);
    res.status(500).json({ error: "Failed to update FAQ" });
  }
});

app.delete("/api/faq/:id", requireAuth, async (req, res) => {
  try {
    await deleteDocFromCollection("faq", req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete FAQ:", error);
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
      rates: 0,
      songs: songCount,
    };
    cache.set("serverStats", data);

    res.json(data);
  } catch (error) {
    console.error("Error fetching server stats:", error);
    res.json({
      accounts: 0,
      levels: 0,
      rates: 0,
      songs: getSongCountFromDB(),
    });
  }
});

// --- GDPS Music Count API (Playwright Browser Automation) ---
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
    await page.goto("https://n01.forever-host.xyz/0004/panel/music/list", {
      waitUntil: "networkidle",
      timeout: 30000
    });

    const loginFormExists = await page.locator("input[name='username'], input[name='user'], input[type='text']").first().isVisible().catch(() => false);

    if (loginFormExists) {
      console.log("Login form detected. Authenticating...");
      await page.fill("input[name='username'], input[name='user'], input[type='text']", username);
      await page.fill("input[name='password'], input[type='password']", password);
      await page.click("button[type='submit'], input[type='submit']");
      await page.waitForNavigation({ waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }

    const musicListSelector = "table tbody tr, .music-list li, [data-music-item], .music-item";
    await page.waitForSelector(musicListSelector, { timeout: 10000 }).catch(() => {});

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
    const cacheKey = "gdpsMusicCount";
    const cachedCount = cache.get(cacheKey);
    if (cachedCount !== undefined) {
      return res.json({ count: cachedCount, cached: true });
    }

    const count = await fetchGDPSMusicCount();

    if (count === null) {
      return res.status(503).json({
        error: "Unable to fetch music count",
        details: "GDPS credentials not configured, connection failed, or music list not found"
      });
    }

    cache.set(cacheKey, count);
    res.json({ count, cached: false });
  } catch (error) {
    console.error("Error in /api/gdps/music/count:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ╨б╤В╨░╤В╨╕╤З╨╡╤Б╨║╨╕╨╡ ╤Д╨░╨╣╨╗╤Л ╨┐╤А╨╕╨╗╨╛╨╢╨╡╨╜╨╕╤П
app.use(express.static(PUBLIC_DIR));

async function startServer() {
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
      if (req.path.includes(".")) {
        return res.status(404).send("File not found");
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

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
