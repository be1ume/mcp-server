import sys

OPERATORS = ("+", "-", "*", "/")


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


def format_result(result):
    return int(result) if result.is_integer() else result


def evaluate_expression(expression):
    parts = expression.split()
    if len(parts) != 3:
        raise ValueError("Enter an expression like: 2 + 3")
    try:
        a = float(parts[0])
        b = float(parts[2])
    except ValueError as err:
        raise ValueError("Error: both operands must be numbers.") from err
    return format_result(calculate(a, parts[1], b))


def interactive():
    print("Interactive calculator. Enter an expression (e.g. 2 + 3) or 'quit' to exit.")
    while True:
        try:
            expression = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if expression.lower() == "quit":
            break
        if not expression:
            continue

        try:
            print(evaluate_expression(expression))
        except (ZeroDivisionError, ValueError) as err:
            print(err)
    return 0


def main(argv):
    if len(argv) == 1:
        return interactive()

    if len(argv) != 4:
        print("Usage: python calc.py <number> <operator> <number>")
        print("Example: python calc.py 2 + 3")
        print("Note: quote the multiplication operator in most shells: '*'")
        return 1

    try:
        result = evaluate_expression(" ".join(argv[1:]))
    except (ZeroDivisionError, ValueError) as err:
        print(err)
        return 1

    print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
