import fs from "node:fs";
import path from "node:path";

const candidateFilenames = [
  "playwright.auth.config.ts",
  "playwright.auth.config.mts",
  "playwright.auth.config.cts",
  "playwright.auth.config.js",
  "playwright.auth.config.mjs",
  "playwright.auth.config.cjs",
] as const;

export function findAuthConfigFile(startDir: string): string | undefined {
  let currentDir = path.resolve(startDir);

  while (true) {
    for (const filename of candidateFilenames) {
      const candidatePath = path.join(currentDir, filename);
      if (fs.existsSync(candidatePath)) return candidatePath;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) return undefined;
    currentDir = parentDir;
  }
}
