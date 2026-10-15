# D001: Iterative insert/search, ignore duplicates
Date: 2026-10-16
Session: S01

Decision: `insert` and `search` are iterative; `inorder_traversal` is recursive via an inner helper and returns a list. Duplicate values are ignored on insert.
Why: Iteration avoids recursion limits on skewed trees; returning a list makes the traversal easy to print and test.
