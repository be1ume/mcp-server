import fs from "fs/promises";
import path from "path";
import { getWorkspace } from "../sandbox.js";

async function buildTree(
  directory: string,
  prefix = ""
): Promise<string[]> {
  const entries = await fs.readdir(directory, {
    withFileTypes: true
  });

  const lines: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      lines.push(`${prefix}├── ${entry.name}/`);

      const children = await buildTree(
        fullPath,
        prefix + "│   "
      );

      lines.push(...children);
    } else {
      lines.push(`${prefix}├── ${entry.name}`);
    }
  }

  return lines;
}

export async function getRepoMap(): Promise<string> {
  const tree = await buildTree(getWorkspace());

  return tree.length > 0
    ? tree.join("\n")
    : "Workspace is empty.";
}