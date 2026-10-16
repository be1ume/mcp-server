# D001: Take input from command-line arguments
Date: 2026-10-16
Session: S01

Decision: The calculator reads its two numbers and operator from command-line arguments (`python calc.py 2 + 3`) rather than from interactive prompts or stdin.

Why:
- It matches the requested usage, `python calc.py 2 + 3`.
- It is the simplest approach for a small tool: no input loop or prompt handling is needed.
- It is scriptable and easy to test, since a single call gives one result with no interaction.
- Errors can be reported on stderr with a non-zero exit code, which suits shell use.
- Consequence: shells may expand an unquoted `*` into filenames, so multiplication must be written as `"*"` (or `\*`). This is documented in the `calc.py` docstring.
