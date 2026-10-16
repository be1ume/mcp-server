# Project State

- **Project folder:** `projects/simple-calculator/`
- **Current session:** `S01`
- **Session status:** `CLOSED`
- **State revision:** `2`

## Goal

A small Python command-line calculator that takes two numbers and an operator as arguments, e.g. `python calc.py 2 + 3`.

## Status

S01 complete. `calc.py` supports `+ - * /` with input from command-line arguments (see D001). Division by zero prints a clear error and exits with code 1. It also reports clear errors for wrong argument count, non-numeric input, and unsupported operators. Behavior was verified on a copy in a scratch sandbox, not directly in the workspace. Multiplication needs a quoted operator (`"*"`) because shells expand a bare `*`.

## Open Work

- No tests or README yet (out of scope for S01).
- Nothing committed to git (no commits exist yet).

## Next Steps

1. Run `python calc.py 2 + 3` in the workspace to confirm it works as verified.
2. Decide whether any further work (tests, docs, features) is wanted in a new session (S02).
