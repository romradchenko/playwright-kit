import fs from "node:fs/promises";
import path from "node:path";

export async function writeFileAtomic(
  filePath: string,
  contents: string,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, contents, "utf8");

  await fs.rm(filePath, { force: true });
  await fs.rename(tempPath, filePath);
}

