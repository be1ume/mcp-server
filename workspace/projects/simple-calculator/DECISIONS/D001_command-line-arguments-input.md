# D001: Take input from command-line arguments
Date: date unknown
Session: S01

Decision: The calculator reads its two numbers and operator from command-line arguments (`python calc.py 2 + 3`) via `sys.argv`, instead of interactive prompts or stdin.

Why: It matches the requested usage example, keeps the program a single short script with no loop or prompt handling, and makes it easy to run and test repeatedly or call from other scripts. `sys.argv` needs no dependencies, so argparse was not used. Note: shells expand an unquoted `*`, so multiplication must be written as `'*'`.
