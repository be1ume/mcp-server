import fs from "fs/promises";
import path from "path";
import { getWorkspace } from "../sandbox.js";

async function getFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true
  });

  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await getFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function searchCode(query: string): Promise<string> {
  const workspace = getWorkspace();

  const files = await getFiles(workspace);

  const results: string[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf8");

      if (content.includes(query)) {
        results.push(
          path.relative(workspace, file)
        );
      }
    } catch {
      // Ignore files that cannot be read as text.
    }
  }

  return results.length > 0
    ? results.join("\n")
    : "No matches found.";
}