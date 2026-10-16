# Plan S01-001: Initial calculator
Date: date unknown
Project folder: projects/simple-calculator/
Goal: Create project structure and a minimal CLI calculator (`python calc.py 2 + 3`) supporting + - * / with a clear division-by-zero error.

Notes:
- Git: branch `main`, no commits yet; no prior history to reconcile.
- Scope is limited to the requested items; no extra features.
- Plan change: calc.py also prints a usage message for a wrong argument count and a short error for non-numeric operands or an unsupported operator, so invalid input does not produce a traceback. No other additions.

- [x] Step 1: Create project structure (PROJECT_STATE.md, PLAN_LOG/, DECISIONS/, CHECKPOINTS/)
- [x] Step 2: Write this plan
- [x] Step 3: Create calc.py supporting + - * / only, with division-by-zero handling
- [x] Step 4: Record decision D001 on command-line arguments as input
- [x] Step 5: Write checkpoint S01 and update PROJECT_STATE.md (status CLOSED)
