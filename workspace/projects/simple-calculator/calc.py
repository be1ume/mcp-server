"""Simple command-line calculator.

Usage:
    python calc.py <number> <operator> <number>

Example:
    python calc.py 2 + 3

Supported operators: + - * /
Note: most shells expand a bare * into filenames, so quote it: python calc.py 2 "*" 3
"""

import sys

USAGE = 'Usage: python calc.py <number> <operator> <number>  (operators: + - * /)'


def calculate(a, op, b):
    if op == "+":
        return a + b
    if op == "-":
        return a - b
    if op == "*":
        return a * b
    if op == "/":
        if b == 0:
            raise ZeroDivisionError("Error: division by zero is not allowed.")
        return a / b
    raise ValueError(f"Error: unsupported operator '{op}'. Use one of: + - * /")


def main(argv):
    if len(argv) != 4:
        print(USAGE, file=sys.stderr)
        return 1

    _, raw_a, op, raw_b = argv

    try:
        a = float(raw_a)
        b = float(raw_b)
    except ValueError:
        print(f"Error: '{raw_a}' and '{raw_b}' must both be numbers.", file=sys.stderr)
        return 1

    try:
        result = calculate(a, op, b)
    except (ZeroDivisionError, ValueError) as err:
        print(err, file=sys.stderr)
        return 1

    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
