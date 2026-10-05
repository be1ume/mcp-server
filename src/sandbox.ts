import path from "path";

const WORKSPACE = path.resolve("./workspace");

export function safePath(relativePath: string): string {
  const resolved = path.resolve(WORKSPACE, relativePath);

  if (
    resolved !== WORKSPACE &&
    !resolved.startsWith(WORKSPACE + path.sep)
  ) {
    throw new Error("Path escapes the workspace sandbox.");
  }

  return resolved;
}

export function getWorkspace(): string {
  return WORKSPACE;
}