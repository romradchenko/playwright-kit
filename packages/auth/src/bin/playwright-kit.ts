#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";

const cliEntryPath = path.join(__dirname, "..", "cli", "main.js");

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", cliEntryPath, ...process.argv.slice(2)],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);

