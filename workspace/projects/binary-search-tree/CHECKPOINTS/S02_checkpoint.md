# Checkpoint S02
Date: 2026-10-16
Project folder: projects/binary-search-tree/
Ended: unclean

Done:
- Added iterative `delete(value)` to `bst.py` (leaf, one-child, two-children via inorder successor); recorded as D002
- Replaced the `__main__` demo with checks of inorder traversal after every insert/delete; executed in the sandbox and all checks passed
- Tested: delete two-children 30, leaf 20, one-child 60, root 50, missing 999, and draining the tree to empty
- Wrote plan S02-001, decision D002, and refreshed `git.log`

Not done:
- No unit-test framework (checks live in the `__main__` block)

Next:
Optionally move the checks into proper unit tests, or add other traversals
