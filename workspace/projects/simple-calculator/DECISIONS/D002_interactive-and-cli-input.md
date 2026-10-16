# D002: Support interactive and command-line input
Date: 2026-10-16
Session: S02

Replaces: D001

Decision: The calculator supports both input methods. Running `python calc.py` without arguments starts an interactive loop accepting expressions such as `2 + 3`; typing `quit` exits. Supplying three command-line arguments continues to calculate a single expression.

Why: Interactive input is convenient for repeated calculations, while preserving argument mode retains the existing usage and supports simple automation.
