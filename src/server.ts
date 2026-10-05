import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { safePath, getWorkspace } from "./sandbox.js";
import { searchCode } from "./tools/search.js";
import { getRepoMap } from "./tools/repo-map.js";

const PORT = 3000;

const app = express();

app.use(express.json());

const server = new McpServer({
  name: "claude-file-server",
  version: "1.0.0"
});

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

app.post("/mcp", async (req, res) => {
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