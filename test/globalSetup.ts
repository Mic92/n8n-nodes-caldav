import { execSync, spawn, type ChildProcess } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const RADICALE_DIR = join(__dirname, "..", ".radicale");
const RADICALE_PORT = 5232;
const RADICALE_HOST = "127.0.0.1";
const TEST_USERNAME = "test";
const TEST_PASSWORD = "test";

let radicaleProcess: ChildProcess | null = null;

async function waitForServer(
  url: string,
  timeout: number = 30000,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url, {
        method: "OPTIONS",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TEST_USERNAME}:${TEST_PASSWORD}`).toString("base64")}`,
        },
      });

      if (response.ok || response.status === 401) {
        return;
      }
    } catch (_error) {
      // Server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

export default async function globalSetup(): Promise<void> {
  console.log("Setting up Radicale CalDAV test server...");

  // Create Radicale directory structure
  const collectionsDir = join(RADICALE_DIR, "collections");
  mkdirSync(collectionsDir, { recursive: true });

  // Create test user with htpasswd
  const usersFile = join(RADICALE_DIR, "users");
  if (!existsSync(usersFile)) {
    console.log(`Creating test user (${TEST_USERNAME}/${TEST_PASSWORD})...`);
    try {
      execSync(
        `htpasswd -Bbc "${usersFile}" "${TEST_USERNAME}" "${TEST_PASSWORD}"`,
        { stdio: "ignore" },
      );
    } catch (_error) {
      throw new Error(
        `Failed to create htpasswd file. Make sure htpasswd is available in PATH.`,
      );
    }
  }

  // Create Radicale configuration
  const configFile = join(RADICALE_DIR, "config");
  const config = `
[server]
hosts = ${RADICALE_HOST}:${RADICALE_PORT}

[auth]
type = htpasswd
htpasswd_filename = ${usersFile}
htpasswd_encryption = bcrypt

[storage]
filesystem_folder = ${collectionsDir}

[logging]
level = info
`;
  writeFileSync(configFile, config);

  // Start Radicale server
  console.log(`Starting Radicale on http://${RADICALE_HOST}:${RADICALE_PORT}`);

  radicaleProcess = spawn("radicale", ["--config", configFile], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  // Store PID for cleanup
  const pidFile = join(RADICALE_DIR, "radicale.pid");
  writeFileSync(pidFile, radicaleProcess.pid?.toString() || "");

  // Log server output
  radicaleProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`[Radicale] ${data.toString().trim()}`);
  });

  radicaleProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`[Radicale Error] ${data.toString().trim()}`);
  });

  radicaleProcess.on("error", (error) => {
    console.error("Failed to start Radicale:", error);
    throw error;
  });

  // Wait for server to be ready
  await waitForServer(`http://${RADICALE_HOST}:${RADICALE_PORT}`);
  console.log("Radicale server is ready!");

  // Store server info in global
  (
    global as { radicaleUrl?: string; radicaleProcess?: ChildProcess }
  ).radicaleUrl = `http://${RADICALE_HOST}:${RADICALE_PORT}`;
  (global as { radicaleProcess?: ChildProcess }).radicaleProcess =
    radicaleProcess;
}
