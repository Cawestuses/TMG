import express from "express";
import rateLimit from "express-rate-limit";
import { randomUUID } from "crypto";

export const SESSION_COOKIE_NAME = "admin_session";

export interface SessionStore {
  createSession(): string;
  isValid(token: string | undefined): boolean;
  revoke(token: string | undefined): void;
}

export function createSessionStore(): SessionStore {
  const activeSessions = new Set<string>();

  return {
    createSession() {
      const token = randomUUID();
      activeSessions.add(token);
      return token;
    },
    isValid(token) {
      return typeof token === "string" && activeSessions.has(token);
    },
    revoke(token) {
      if (typeof token === "string") {
        activeSessions.delete(token);
      }
    },
  };
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  };
}

export function createRequireAuth(sessionStore: SessionStore) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionStore.isValid(token)) {
      next();
      return;
    }
    res.status(401).json({ error: "Unauthorized" });
  };
}

export function createLoginRateLimiter(options?: { max?: number; windowMs?: number }) {
  return rateLimit({
    windowMs: options?.windowMs ?? 15 * 60 * 1000,
    max: options?.max ?? 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много попыток входа. Попробуйте через 15 минут." },
  });
}

export function registerAdminAuthRoutes(
  app: express.Express,
  sessionStore: SessionStore,
  loginRateLimiter = createLoginRateLimiter()
) {
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
      const sessionToken = sessionStore.createSession();
      res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());
      return res.json({ success: true });
    }

    return res.status(401).json({ error: "Неверный логин или пароль" });
  });

  app.get("/api/admin/session", (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    res.json({ authenticated: sessionStore.isValid(token) });
  });

  app.post("/api/admin/logout", (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    sessionStore.revoke(token);
    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    res.json({ success: true });
  });
}
