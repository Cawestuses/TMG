import helmet from "helmet";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import NodeCache from "node-cache";
import fs from "fs";
import { randomUUID } from "crypto";
import multer from "multer";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { z } from "zod";
import "dotenv/config";
import { chromium, Browser, Page } from "playwright";
import { initializeApp, applicationDefault, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import {
  extensionForImageType,
  isAllowedImageUpload,
  mimetypeForImageType,
  resolveUploadUrl,
  validateUploadedImageFile,
} from "./src/lib/uploadService";

const app = express();
const PORT = Number(process.env.PORT || 3000);
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
const SESSION_COOKIE_NAME = "admin_session";
const activeSessions = new Set<string>();

app.set("trust proxy", 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много попыток входа. Попробуйте через 15 минут." },
});

const newsCreateSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().min(1).max(50000),
  author: z.string().trim().min(1).max(200),
  date: z.string().datetime().optional(),
}).strict();

const newsUpdateSchema = newsCreateSchema.partial().strict();

const staffCreateSchema = z.object({
  nickname: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(200),
  category: z.enum(["private_server", "discord_moderation"]),
  avatarUrl: z.string().trim().max(2000).optional(),
  socialLink: z.string().trim().max(500).optional(),
  order: z.coerce.number().int().min(0).max(10000),
}).strict();

const staffUpdateSchema = staffCreateSchema.strict();

const faqCreateSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().min(1).max(10000),
  order: z.coerce.number().int().min(0).max(10000),
}).strict();

const faqUpdateSchema = faqCreateSchema.strict();

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

function stripClientId(body: Record<string, unknown>) {
  const { id: _ignored, ...rest } = body;
  return rest;
}

function parseBody<T>(schema: z.ZodType<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues.map((issue) => issue.message).join("; ");
    return { success: false, error: message || "Invalid request body" };
  }
  return { success: true, data: result.data };
}

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
try {
  db = getFirestore();
} catch (e) {
  console.warn("Firebase initialization failed:", e);
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, _file, cb) => cb(null, `${randomUUID()}.tmp`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImageUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
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
app.post("/api/admin/login", loginRateLimiter, (req, res) => {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  if (!adminUser || !adminPass) {
    return res.status(503).json({ error: "Админ-авторизация не настроена на сервере" });
  }

  const { username, password } = req.body ?? {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Неверный формат запроса" });
  }

  if (username === adminUser && password === adminPass) {
    const sessionToken = randomUUID();
    activeSessions.add(sessionToken);
    res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
    return res.json({ success: true });
  }

  return res.status(401).json({ error: "Неверный логин или пароль" });
});

app.get("/api/admin/session", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  res.json({ authenticated: typeof token === "string" && activeSessions.has(token) });
});

app.post("/api/admin/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === "string") {
    activeSessions.delete(token);
  }
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
  res.json({ success: true });
});

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (typeof token === "string" && activeSessions.has(token)) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

// --- Upload API (Firebase Storage с фолбэком на локальное хранилище) ---
app.post("/api/upload", requireAuth, (req, res) => {
  upload.single("image")(req, res, async (err: any) => {
    const file = req.file;

    if (err) {
      return res.status(400).json({ error: err.message || "Failed to upload image" });
    }

    if (!file?.path) {
      return res.status(400).json({ error: "No image file provided (field 'image' expected)" });
    }

    try {
      const detectedType = validateUploadedImageFile(file.path);
      if (!detectedType) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: "Invalid image file. Only JPEG, PNG, and WebP are allowed." });
      }

      const finalName = `${randomUUID()}${extensionForImageType(detectedType)}`;
      const finalPath = path.join(UPLOAD_DIR, finalName);
      fs.renameSync(file.path, finalPath);

      const uploadFile = {
        path: finalPath,
        filename: finalName,
        originalname: finalName,
        mimetype: mimetypeForImageType(detectedType),
      };

      const resolvedUrl = await resolveUploadUrl(uploadFile, {
        uploadToCloud: async (cloudFile, destination) => {
          if (!hasServiceAccount || !storageBucketName) {
            throw new Error("Cloud upload is unavailable");
          }

          const bucket = getStorage().bucket();
          await bucket.upload(cloudFile.path, {
            destination,
            public: true,
            metadata: {
              contentType: cloudFile.mimetype,
            },
          });

          if (fs.existsSync(cloudFile.path)) {
            fs.unlinkSync(cloudFile.path);
          }

          return `https://storage.googleapis.com/${bucket.name}/${destination}`;
        },
      });

      return res.json({ url: resolvedUrl });
    } catch (error: any) {
      console.error("Upload failed:", error);
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json({ error: error.message || "Failed to process uploaded file" });
    }
  });
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
    const parsed = parseBody(newsCreateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const newPost = {
      id: randomUUID(),
      ...parsed.data,
      date: parsed.data.date || new Date().toISOString(),
    };
    const saved = await saveDocToCollection("news", newPost);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save news:", error);
    res.status(500).json({ error: "Failed to save news" });
  }
});

app.put("/api/news/:id", requireAuth, async (req, res) => {
  try {
    const parsed = parseBody(newsUpdateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const updated = await updateDocInCollection("news", req.params.id, parsed.data);
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
    const parsed = parseBody(staffCreateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const localData = readDB();
    const existing = (localData.staff || []).find(
      (s: any) => s.nickname.toString().toLowerCase() === parsed.data.nickname.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: "Такой никнейм уже существует" });
    }

    const newStaff = { id: randomUUID(), ...parsed.data };
    const saved = await saveDocToCollection("staff", newStaff);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save staff:", error);
    res.status(500).json({ error: "Failed to save staff" });
  }
});

app.put("/api/staff/:id", requireAuth, async (req, res) => {
  try {
    const parsed = parseBody(staffUpdateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const localData = readDB();
    const list = localData.staff || [];
    const duplicate = list.find(
      (s: any) => s.id !== req.params.id && s.nickname.toString().toLowerCase() === parsed.data.nickname.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({ error: "Такой никнейм уже существует" });
    }

    const updated = await updateDocInCollection("staff", req.params.id, parsed.data);
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
    const parsed = parseBody(faqCreateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const newFaq = { id: randomUUID(), ...parsed.data };
    const saved = await saveDocToCollection("faq", newFaq);
    res.json(saved);
  } catch (error) {
    console.error("Failed to save FAQ:", error);
    res.status(500).json({ error: "Failed to save FAQ" });
  }
});

app.put("/api/faq/:id", requireAuth, async (req, res) => {
  try {
    const parsed = parseBody(faqUpdateSchema, stripClientId(req.body ?? {}));
    if (parsed.success === false) {
      return res.status(400).json({ error: parsed.error });
    }

    const updated = await updateDocInCollection("faq", req.params.id, parsed.data);
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

    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

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

// Статические файлы приложения
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