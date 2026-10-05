# Claude MCP File Server

A remote MCP server that provides file tools for the `workspace/` directory.

## Requirements

- Node.js and npm
- ngrok for a public HTTPS URL
- PM2 

## Install

From the project directory:

```powershell
npm install
```

## Configure and Run

Set a long, random secret for `MCP_AUTH_TOKEN`. Keep it private. Start ngrok in a separate terminal:

```powershell
ngrok http 3000
```

Copy the HTTPS forwarding URL from ngrok, then configure the server in PowerShell. Include `/mcp` in `MCP_PUBLIC_URL`:

```powershell
$env:MCP_AUTH_TOKEN = "your-long-random-secret"
$env:MCP_PUBLIC_URL = "https://your-ngrok-host.ngrok-free.dev/mcp"
npm run dev
```

The MCP endpoint is `http://localhost:3000/mcp` locally and the HTTPS `/mcp` URL through ngrok. The server uses port `3000` by default; set `PORT` to use a different port.

## Run with PM2

Set `MCP_AUTH_TOKEN` and `MCP_PUBLIC_URL` in the same PowerShell session, then start the server:

```powershell
npx pm2 start npm --name claude-mcp -- run dev
npx pm2 save
```

After changing server code or environment variables, restart it from a PowerShell session with the desired variables set:

```powershell
npx pm2 restart claude-mcp --update-env
```

View status and logs with `npx pm2 list` and `npx pm2 logs claude-mcp`.

## Connect Claude

In Claude, add a custom connector using the ngrok HTTPS URL ending in `/mcp`. Choose **Sign in now** and **Register automatically**. On the sign-in page, enter the raw `MCP_AUTH_TOKEN` value without the `Bearer ` prefix.

The MCP Inspector can continue using the fixed bearer token: `Authorization: Bearer <MCP_AUTH_TOKEN>`. OAuth tokens are held in memory, so reconnect Claude after restarting the server.

## Tools

The server provides `list_files`, `read_file`, `write_file`, `str_replace`, `move_file`, `delete_file`, `search_code`, and `get_repo_map`. File tools are sandboxed to `workspace/`.

## Project Docs

- [Project state](workspace/PROJECT_STATE.md)
- Checkpoints: [001](workspace/CHECKPOINTS/001.md), [002](workspace/CHECKPOINTS/002.md), [003](workspace/CHECKPOINTS/003.md)
- Plan logs: [001](workspace/PLAN_LOG/001.md), [002](workspace/PLAN_LOG/002.md)