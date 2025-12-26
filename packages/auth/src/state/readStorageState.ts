import fs from "node:fs/promises";

export async function readStorageStateJson(
  storageStatePath: string,
): Promise<unknown> {
  const raw = await fs.readFile(storageStatePath, "utf8");
  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid JSON in storageState file "${storageStatePath}": ${message}`,
    );
  }
}

