import { chromium } from "playwright";
import { spawn } from "child_process";
import path from "path";
import process from "process";

const serverCwd = path.resolve(process.cwd());
const testPort = 0;
const serverCmd = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
const serverArgs = process.platform === "win32"
  ? ["/c", "npx tsx server.ts"]
  : ["-c", "npx tsx server.ts"];

function startServer() {
  const serverProcess = spawn(serverCmd, serverArgs, {
    cwd: serverCwd,
    env: { ...process.env, PORT: String(testPort) },
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });

  return new Promise<{ process: typeof serverProcess; port: number }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Server did not start within 20 seconds"));
    }, 20000);

    const listener = (data: Buffer) => {
      const text = data.toString();
      process.stdout.write(text);
      const match = text.match(/Server running on port (\d+)/);
      if (match) {
        const port = Number(match[1]);
        clearTimeout(timeout);
        serverProcess.stdout?.off("data", listener);
        resolve({ process: serverProcess, port });
      }
    };

    serverProcess.stdout?.on("data", listener);
    serverProcess.on("error", reject);
    serverProcess.on("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server process exited prematurely with code ${code}`));
    });
  });
}

async function runTest() {
  const { process: serverProcess, port } = await startServer();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const url = `http://127.0.0.1:${port}`;
    await page.goto(url, { waitUntil: "networkidle" });

    await page.waitForSelector("[data-testid=\"songs-count\"]", { timeout: 15000 });
    const songsText = await page.textContent("[data-testid=\"songs-count\"]");
    if (!songsText) {
      throw new Error("Songs count element is present but empty");
    }

    const songCount = Number(songsText.replace(/[^\d]/g, ""));
    if (Number.isNaN(songCount)) {
      throw new Error(`Songs count is not a number: ${songsText}`);
    }

    console.log(`Found songs count text: ${songsText}`);
    console.log(`Parsed songs count: ${songCount}`);

    if (songCount <= 0) {
      throw new Error("Songs count is 0 or missing; expected a positive number");
    }

    console.log(`✅ Songs count check passed: ${songCount}`);
  } finally {
    await browser.close();
    serverProcess.kill();
  }
}

runTest().catch((error) => {
  console.error("❌ Playwright test failed:", error);
  process.exit(1);
});
