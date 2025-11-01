import { readFileSync, existsSync, unlinkSync, rmSync } from "fs";
import { join } from "path";

const RADICALE_DIR = join(__dirname, "..", ".radicale");

export default async function globalTeardown(): Promise<void> {
	console.log("Stopping Radicale CalDAV test server...");

	const pidFile = join(RADICALE_DIR, "radicale.pid");

	if (existsSync(pidFile)) {
		try {
			const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);

			if (pid && !isNaN(pid)) {
				try {
					process.kill(pid, "SIGTERM");
					console.log(`Radicale server (PID: ${pid}) stopped`);
				} catch (error) {
					// Process might already be dead
					const errorMessage = error instanceof Error ? error.message : String(error);
					console.log(`Process ${pid} not found (might have already stopped): ${errorMessage}`);
				}
			}

			unlinkSync(pidFile);
		} catch (error) {
			console.error("Error stopping Radicale:", error);
		}
	}

	// Clean up test data
	const collectionsDir = join(RADICALE_DIR, "collections");
	if (existsSync(collectionsDir)) {
		try {
			rmSync(collectionsDir, { recursive: true, force: true });
			console.log("Cleaned up test data");
		} catch (error) {
			console.error("Error cleaning up test data:", error);
		}
	}
}
