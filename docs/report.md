# MCP File-Server Connector

**Author:** Luciano Martin Mariano | **Course project:** Midterms Pt 1 | **Repository:** https://github.com/be1ume/mcp-server

## Overview

This project provides a Node.js and TypeScript MCP server that lets Claude and other MCP clients access a sandboxed local `workspace/` over HTTP. The README's connection flow is:

```text
Claude -> HTTPS -> ngrok -> Node.js server (port 3000) -> workspace/
```

## Tech stack

| Area | Technology |
|---|---|
| Runtime and language | Node.js 20.6+, TypeScript, ES modules |
| MCP | `@modelcontextprotocol/sdk` with Streamable HTTP |
| HTTP framework | Express |
| Input validation | Zod |
| Development and build | `tsx` for development; `tsc` for production builds |
| Deployment | ngrok for remote access; pm2 for process management |

The server provides tools for listing, reading, writing, replacing, moving, and deleting workspace files, searching code, viewing the workspace tree, and inspecting Git status, diffs, and history.

## Security and handoff

Workspace paths are checked by `safePath()` to prevent `../` traversal outside `workspace/`. The `/mcp` endpoint requires `MCP_AUTH_TOKEN`; OAuth sign-in is also implemented. The README advises keeping `.env` secret and treating workspace content as data, not instructions.

`workspace/PROTOCOL.md` describes how agents use project state, plans, checkpoints, and decision records to hand off work between sessions. The server provides file access, but does not enforce that workflow.

## Run and verify

Build with `npm run build`, run the server with the documented setup, then connect through ngrok and Claude's custom connector. The README's quick check is to write and read `hello.txt`, then verify that reading `../package.json` is rejected.

## Evidence pictures

These screenshots are in [`docs/evidence/`](./evidence/):

- [00-claude-mcp-connect.png](./evidence/00-claude-mcp-connect.png) — Claude MCP connection
- [01-pm2-status.png](./evidence/01-pm2-status.png) — pm2 status
- [02-tool-list.png](./evidence/02-tool-list.png) — available tools
- [03-tool_call.png](./evidence/03-tool_call.png) — tool call
- [04-auth-without-bearer-token.png](./evidence/04-auth-without-bearer-token.png) — authentication without a bearer token
- [05-sandbox-blocked.png](./evidence/05-sandbox-blocked.png) — sandbox path rejection
- [06-demo-Session-1.png](./evidence/06-demo-Session-1.png) — demo session 1
- [07-demo-session-2.png](./evidence/07-demo-session-2.png) — demo session 2
- [08-multiple-agent-working.png](./evidence/08-multiple-agent-working.png) — multiple agents working

## Binary search tree project records

The project handoff artifacts for `workspace/projects/binary-search-tree/` are:

- [PROJECT_STATE.md](../workspace/projects/binary-search-tree/PROJECT_STATE.md) — current project status and next steps
- [S01_checkpoint.md](../workspace/projects/binary-search-tree/CHECKPOINTS/S01_checkpoint.md) and [S02_checkpoint.md](../workspace/projects/binary-search-tree/CHECKPOINTS/S02_checkpoint.md) — session summaries
- [S01_001_bst-implementation.md](../workspace/projects/binary-search-tree/PLAN_LOG/S01_001_bst-implementation.md) and [S02_001_add-delete.md](../workspace/projects/binary-search-tree/PLAN_LOG/S02_001_add-delete.md) — implementation plans
- [D001_iterative-insert-search.md](../workspace/projects/binary-search-tree/DECISIONS/D001_iterative-insert-search.md) and [D002_iterative-delete-successor.md](../workspace/projects/binary-search-tree/DECISIONS/D002_iterative-delete-successor.md) — design decisions
- [bst.py](../workspace/projects/binary-search-tree/bst.py) — binary search tree implementation
- [git.log](../workspace/projects/binary-search-tree/git.log) — recorded Git history

## The Prompt Used
```
Session 1 prompt:
Create a simple Binary Search Tree (BST) in Python using the available MCP tools. Implement a `Node` class and a `BST` class with `insert()`, `search()`, and `inorder_traversal()` methods. Insert the values `[50, 30, 70, 20, 40, 60, 80]`, test searching for `40` and `100`, and print the inorder traversal. Use the available tools efficiently, minimize unnecessary resource usage and tool calls, and execute the code to verify that it works. Return the Python code and the execution results.

Session 2 prompt:
consider this session as session 2. Continue improving the existing Python Binary Search Tree (BST) from Session 1 using the available MCP tools. Add a delete(value) method to remove nodes from the tree and handle all three cases: deleting a leaf node, a node with one child, and a node with two children. Test inserting, searching, and deleting values, then verify the inorder traversal after each operation. Reuse the existing code where possible, execute the updated implementation, and report the results. 
```