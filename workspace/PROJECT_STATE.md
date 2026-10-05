# Project State

## Current Project

Claude MCP File Server

## Current Milestone

M3 - Claude Web Connection

## Completed

- Node.js MCP server created
- Streamable HTTP configured
- MCP Inspector configured
- Workspace sandbox implemented
- list_files implemented
- read_file implemented
- write_file implemented
- str_replace implemented
- move_file implemented
- delete_file implemented
- search_code implemented
- get_repo_map implemented
- Bearer-token authentication implemented for MCP Inspector
- OAuth support implemented for Claude, including PKCE and token refresh
- OAuth flow and MCP tool listing tested locally
- ngrok IPv6/DNS connection issue fixed by switching DNS to Google DNS

## Next Steps

- Add Git tools
- Add logging
- Restart the PM2-managed server with the OAuth changes
- Reconnect the ngrok MCP URL in Claude using OAuth
- Verify Claude can use the MCP tools
- Perform multi-session demonstration

## Security Rules

All file operations must remain inside workspace/.

Never access files outside workspace/.

Never expose authentication tokens.

## Notes

The MCP server runs on port 3000. Keep `MCP_AUTH_TOKEN` configured; use it on the OAuth sign-in page when connecting Claude. OAuth tokens are stored in memory, so users must reconnect after a server restart.