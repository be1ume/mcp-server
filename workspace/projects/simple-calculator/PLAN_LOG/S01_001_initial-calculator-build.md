# Plan S01-001: Initial calculator build
Date: 2026-10-16
Project folder: projects/simple-calculator/
Goal: Build a small Python CLI calculator (`python calc.py 2 + 3`) supporting + - * / only, with a clear error on division by zero. No extra features.

Git at session start: branch main, no commits yet; no changes under the project folder other than the files created this session.

- [x] Step 1: Create project structure (PLAN_LOG/, CHECKPOINTS/, DECISIONS/) and PROJECT_STATE.md
- [x] Step 2: Write this plan in PLAN_LOG/
- [x] Step 3: Create calc.py supporting + - * / only; handle division by zero with a clear error message instead of a crash
- [x] Step 4: Record a decision on why input comes from command-line arguments (DECISIONS/D001)
- [x] Step 5: Check git state, write CHECKPOINTS/S01_checkpoint.md, and update PROJECT_STATE.md (status CLOSED)

Notes:
- Scope is limited to what the user requested; no extra features (no parsing of expressions, no extra operators, no interactive mode).
- Plan change/clarification: `calc.py` also includes minimal input validation (wrong argument count, non-numeric input, unsupported operator) that prints a clear error and exits with code 1. This was judged part of "supporting + - * / only" and avoiding crashes, not an added feature.
- Verification: a copy of `calc.py` was run in a scratch sandbox (the agent's shell cannot reach the workspace). Results: `2 + 3` = 5.0, `7 - 10` = -3.0, `6 "*" 4` = 24.0, `9 / 2` = 4.5, `5 / 0` gives the clear error, and bad operator or bad numbers give clear errors. An unquoted `*` is expanded by the shell, as documented in D001.
