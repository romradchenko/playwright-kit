import fs from "node:fs/promises";
import path from "node:path";

export async function writeFileAtomic(
  filePath: string,
  contents: string,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const uniqueSuffix = `${process.pid}-${Date.now()}`;
  const tempPath = `${filePath}.tmp-${uniqueSuffix}`;
  const backupPath = `${filePath}.bak-${uniqueSuffix}`;
  await fs.writeFile(tempPath, contents, "utf8");

  let backupCreated = false;

  try {
    try {
      await fs.rename(filePath, backupPath);
      backupCreated = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    await fs.rename(tempPath, filePath);
  } catch (error) {
    if (backupCreated) {
      try {
        await fs.rm(filePath, { force: true });
        await fs.rename(backupPath, filePath);
      } catch {
        // Best-effort restore.
      }
    }

    throw error;
  } finally {
    try {
      await fs.rm(tempPath, { force: true });
    } catch {
      // Best-effort cleanup.
    }

    if (backupCreated) {
      try {
        await fs.rm(backupPath, { force: true });
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}

