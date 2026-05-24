// Cross-platform copy of the client build into the server's static dir.
// Replaces the unix-only `rm -rf && cp -r`, which fails on Windows.
import { cpSync, existsSync, rmSync } from "node:fs";

const src = "client/dist";
const dest = "server/static";

if (!existsSync(src)) {
	console.error(
		`[copy-static] source not found: ${src} — run the client build first (bun run build).`,
	);
	process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
console.log(`[copy-static] copied ${src} -> ${dest}`);
