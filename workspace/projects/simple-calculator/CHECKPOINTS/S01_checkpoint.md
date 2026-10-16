# Checkpoint S01
Date: 2026-10-16
Project folder: projects/simple-calculator/
Ended: clean
Git: main, last commit none (no commits yet), dirty (all files untracked, as expected for a new project)

Done:
- Created project structure: `PROJECT_STATE.md`, `PLAN_LOG/`, `DECISIONS/`, `CHECKPOINTS/`.
- Wrote plan `PLAN_LOG/S01_001_initial-calculator-build.md` and marked all steps complete.
- Created `calc.py`: supports `+ - * /` only, takes `<number> <operator> <number>` from command-line arguments, and prints a clear error (exit code 1) on division by zero instead of crashing. It also prints clear errors for wrong argument count, non-numeric input, and unsupported operators.
- Recorded `DECISIONS/D001_command-line-arguments-for-input.md`.
- Verified behavior by running a copy of `calc.py` in a scratch sandbox (the agent's shell could not reach the workspace). The file in the workspace was not executed directly.
- Git check matched the Done list: only untracked files (`projects/`), no unexplained changes. Nothing was staged or committed.

Not done:
- No automated tests were written (out of scope for this session).
- No README or usage docs beyond the `calc.py` docstring (out of scope).
- Nothing committed to git (not requested).

Next:
1. Run `python calc.py 2 + 3` in the workspace to confirm it behaves as verified in the sandbox. Quote the operator for multiplication: `python calc.py 6 "*" 4`.
2. Decide whether to add features or tests in a future session.
