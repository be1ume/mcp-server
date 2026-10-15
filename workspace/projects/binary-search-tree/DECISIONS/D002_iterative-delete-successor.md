# D002: Iterative delete using the inorder successor
Date: 2026-10-16
Session: S02

Decision: `delete(value)` is iterative and returns True if a node was removed, False if the value was absent. For a node with two children, its value is replaced by the inorder successor's value (smallest value in the right subtree) and the successor node is spliced out. Leaf and one-child nodes are spliced out by relinking the parent (or `root`).
Why: Matches D001 (iterative, no recursion limits on skewed trees), reuses the existing `Node`/`BST` structure, and the successor approach keeps the tree ordered without restructuring subtrees.
