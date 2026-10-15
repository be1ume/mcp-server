import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { safePath, getWorkspace } from "./sandbox.js";
import { configureOAuth } from "./oauth.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PORT = Number(process.env.PORT ?? 3000);

const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const PUBLIC_MCP_URL = process.env.MCP_PUBLIC_URL;

const app = express();

app.set("trust proxy", 1);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const isOAuthAccessToken = configureOAuth(app, {
  authToken: AUTH_TOKEN,
  getResourceUrl: (req) => {
    if (PUBLIC_MCP_URL) {
      return new URL(PUBLIC_MCP_URL).toString().replace(/\/$/, "");
    }

    return `${req.protocol}://${req.get("host")}/mcp`;
  }
});

const server = new McpServer({
  name: "claude-file-server",
  version: "1.0.0"
});

const execFileAsync = promisify(execFile);
const MAX_GIT_OUTPUT_CHARS = 50_000;

async function runGit(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["--no-pager", "-c", "core.quotepath=false", ...args],
      {
        cwd: getWorkspace(),
        timeout: 10_000,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0" }
      }
    );

    const output = stdout.trim();

    return output.length > MAX_GIT_OUTPUT_CHARS
      ? `${output.slice(0, MAX_GIT_OUTPUT_CHARS)}\n... output truncated`
      : output;
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & { stderr?: string };

    if (failure.code === "ENOENT") {
      throw new Error("git is not installed or not on PATH.");
    }

    throw new Error(failure.stderr?.trim() || failure.message);
  }
}

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

async function searchCode(query: string): Promise<string> {
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

async function getRepoMap(): Promise<string> {
  const tree = await buildTree(getWorkspace());

  return tree.length > 0
    ? tree.join("\n")
    : "Workspace is empty.";
}

server.tool(
  "list_files",
  "List files and folders inside the sandboxed workspace.",
  {
    path: z.string().optional()
  },
  async ({ path: directoryPath }) => {
    try {
      const fullPath = safePath(directoryPath ?? ".");
      const entries = await fs.readdir(fullPath, {
        withFileTypes: true
      });

      const files = entries.map((entry) => {
        return entry.isDirectory()
          ? `[DIR] ${entry.name}`
          : `[FILE] ${entry.name}`;
      });

      return {
        content: [
          {
            type: "text",
            text: files.join("\n") || "Workspace is empty."
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "read_file",
  "Read a text file inside the workspace sandbox.",
  {
    path: z.string()
  },
  async ({ path: filePath }) => {
    try {
      const fullPath = safePath(filePath);

      const content = await fs.readFile(fullPath, "utf8");

      return {
        content: [
          {
            type: "text",
            text: content
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "write_file",
  "Create or overwrite a text file inside the workspace sandbox.",
  {
    path: z.string(),
    content: z.string()
  },
  async ({ path: filePath, content }) => {
    try {
      const fullPath = safePath(filePath);

      await fs.mkdir(path.dirname(fullPath), {
        recursive: true
      });

      await fs.writeFile(fullPath, content, "utf8");

      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote ${filePath}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error writing file: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "str_replace",
  "Replace an exact string in a text file inside the workspace sandbox.",
  {
    path: z.string(),
    old_string: z.string(),
    new_string: z.string(),
    replace_all: z.boolean().optional()
  },
  async ({ path: filePath, old_string: oldString, new_string: newString, replace_all: replaceAll }) => {
    try {
      if (!oldString) {
        throw new Error("old_string must not be empty.");
      }

      const fullPath = safePath(filePath);
      const content = await fs.readFile(fullPath, "utf8");
      const firstMatch = content.indexOf(oldString);

      if (firstMatch === -1) {
        throw new Error("old_string was not found in the file.");
      }

      if (!replaceAll && content.indexOf(oldString, firstMatch + oldString.length) !== -1) {
        throw new Error("old_string occurs more than once; provide a unique string or set replace_all to true.");
      }

      const updatedContent = replaceAll
        ? content.split(oldString).join(newString)
        : content.slice(0, firstMatch) + newString + content.slice(firstMatch + oldString.length);

      await fs.writeFile(fullPath, updatedContent, "utf8");

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated ${filePath}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error replacing text: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "move_file",
  "Move or rename a file inside the workspace sandbox.",
  {
    source_path: z.string(),
    destination_path: z.string()
  },
  async ({ source_path: sourcePath, destination_path: destinationPath }) => {
    try {
      const source = safePath(sourcePath);
      const destination = safePath(destinationPath);
      const sourceStats = await fs.stat(source);

      if (!sourceStats.isFile()) {
        throw new Error("source_path must refer to a file.");
      }

      await fs.rename(source, destination);

      return {
        content: [
          {
            type: "text",
            text: `Successfully moved ${sourcePath} to ${destinationPath}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error moving file: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "delete_file",
  "Delete a file inside the workspace sandbox.",
  {
    path: z.string()
  },
  async ({ path: filePath }) => {
    try {
      const fullPath = safePath(filePath);
      const stats = await fs.stat(fullPath);

      if (!stats.isFile()) {
        throw new Error("path must refer to a file.");
      }

      await fs.unlink(fullPath);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted ${filePath}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting file: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "search_code",
  "Search text files inside the workspace for a given string.",
  {
    query: z.string()
  },
  async ({ query }) => {
    try {
      const results = await searchCode(query);

      return {
        content: [
          {
            type: "text",
            text: results
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "get_repo_map",
  "Show the directory structure of the workspace.",
  {},
  async () => {
    try {
      const tree = await getRepoMap();

      return {
        content: [
          {
            type: "text",
            text: tree
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "git_status",
  "Show the git status of the workspace.",
  {},
  async () => {
    try {
      const output = await runGit(["status", "--short", "--branch", "--", "."]);

      return {
        content: [
          {
            type: "text",
            text: output
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "git_diff",
  "Show the working tree diff, or the staged diff, for the workspace or one path inside it.",
  {
    staged: z.boolean().optional(),
    path: z.string().optional()
  },
  async ({ staged, path: diffPath }) => {
    try {
      const target = path.relative(getWorkspace(), safePath(diffPath || ".")) || ".";
      const args = ["diff", "--no-color", "--no-ext-diff", "--no-textconv"];

      if (staged) {
        args.push("--staged");
      }

      args.push("--", target);

      const output = await runGit(args);

      return {
        content: [
          {
            type: "text",
            text: output || (staged ? "No staged changes." : "No unstaged changes.")
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

server.tool(
  "git_log",
  "Show recent commits that touched the workspace.",
  {
    limit: z.number().int().min(1).max(100).optional()
  },
  async ({ limit }) => {
    try {
      const output = await runGit([
        "log",
        `-n${limit ?? 10}`,
        "--date=short",
        "--pretty=format:%h %ad %an  %s",
        "--",
        "."
      ]);

      return {
        content: [
          {
            type: "text",
            text: output || "No commits yet."
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error}`
          }
        ],
        isError: true
      };
    }
  }
);

app.post("/mcp", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!AUTH_TOKEN) {
    res.status(500).json({
      error: "MCP_AUTH_TOKEN is not configured."
    });

    return;
  }

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  const isStaticToken = token === AUTH_TOKEN;

  if (!isStaticToken && !isOAuthAccessToken(token)) {
    const resourceMetadataUrl = new URL("/.well-known/oauth-protected-resource", `${req.protocol}://${req.get("host")}`).toString();
    res.set("WWW-Authenticate", `Bearer resource_metadata="${resourceMetadataUrl}"`);
    res.status(401).json({ error: "Unauthorized" });

    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
  });

  await server.connect(transport);

  await transport.handleRequest(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(
    `MCP server running at http://localhost:${PORT}/mcp`
  );

  console.log(
    `Workspace: ${getWorkspace()}`
  );
});