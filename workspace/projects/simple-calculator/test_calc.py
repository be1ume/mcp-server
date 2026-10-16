import unittest

from calc import calculate, evaluate_expression


class CalculatorTests(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(calculate(2, "+", 3), 5)

    def test_subtraction(self):
        self.assertEqual(calculate(7, "-", 2), 5)

    def test_multiplication(self):
        self.assertEqual(calculate(4, "*", 3), 12)

    def test_division(self):
        self.assertEqual(calculate(8, "/", 2), 4)

    def test_division_by_zero(self):
        with self.assertRaisesRegex(ZeroDivisionError, "division by zero"):
            calculate(5, "/", 0)

    def test_expression_parsing(self):
        self.assertEqual(evaluate_expression("2 + 3"), 5)


if __name__ == "__main__":
    unittest.main()
