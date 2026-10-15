class Node:
    """A single node in a binary search tree."""

    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


class BST:
    """Binary search tree (duplicates are ignored)."""

    def __init__(self):
        self.root = None

    def insert(self, value):
        if self.root is None:
            self.root = Node(value)
            return
        current = self.root
        while True:
            if value < current.value:
                if current.left is None:
                    current.left = Node(value)
                    return
                current = current.left
            elif value > current.value:
                if current.right is None:
                    current.right = Node(value)
                    return
                current = current.right
            else:
                return  # duplicate, ignore

    def search(self, value):
        current = self.root
        while current is not None:
            if value == current.value:
                return True
            current = current.left if value < current.value else current.right
        return False

    def delete(self, value):
        """Remove value from the tree. Returns True if removed, False if absent."""
        parent = None
        current = self.root
        while current is not None and current.value != value:
            parent = current
            current = current.left if value < current.value else current.right
        if current is None:
            return False

        # Case 3: two children -> replace value with inorder successor's value,
        # then remove the successor node (which has at most one right child).
        if current.left is not None and current.right is not None:
            succ_parent = current
            succ = current.right
            while succ.left is not None:
                succ_parent = succ
                succ = succ.left
            current.value = succ.value
            parent, current = succ_parent, succ

        # Case 1 (leaf) and Case 2 (one child): splice the node out.
        child = current.left if current.left is not None else current.right
        if parent is None:
            self.root = child
        elif parent.left is current:
            parent.left = child
        else:
            parent.right = child
        return True

    def inorder_traversal(self):
        result = []

        def visit(node):
            if node is None:
                return
            visit(node.left)
            result.append(node.value)
            visit(node.right)

        visit(self.root)
        return result


if __name__ == "__main__":
    tree = BST()
    for v in [50, 30, 70, 20, 40, 60, 80]:
        tree.insert(v)

    def check(label, expected):
        actual = tree.inorder_traversal()
        status = "PASS" if actual == expected else "FAIL"
        print(f"[{status}] {label}: {actual}")
        assert actual == expected, f"expected {expected}"

    check("after inserts", [20, 30, 40, 50, 60, 70, 80])

    # Search (existing behavior)
    assert tree.search(40) is True
    assert tree.search(100) is False
    print("[PASS] search(40)=True, search(100)=False")

    # Insert extra values to build richer shapes
    for v in [65, 35]:
        tree.insert(v)
    check("after inserting 65, 35", [20, 30, 35, 40, 50, 60, 65, 70, 80])

    # Case 3: two children (30 has left child 20 and right subtree 40 -> 35)
    assert tree.delete(30) is True
    assert tree.search(30) is False
    check("delete two-children 30", [20, 35, 40, 50, 60, 65, 70, 80])

    # Case 1: leaf
    assert tree.delete(20) is True
    assert tree.search(20) is False
    check("delete leaf 20", [35, 40, 50, 60, 65, 70, 80])

    # Case 2: one child (60 has only right child 65)
    assert tree.delete(60) is True
    assert tree.search(60) is False
    check("delete one-child 60", [35, 40, 50, 65, 70, 80])

    # Case 3 on the root
    assert tree.delete(50) is True
    assert tree.search(50) is False
    check("delete root 50", [35, 40, 65, 70, 80])

    # Missing value
    assert tree.delete(999) is False
    check("delete missing 999", [35, 40, 65, 70, 80])

    # Drain the tree
    for v in [35, 40, 65, 70, 80]:
        assert tree.delete(v) is True
    check("delete all remaining", [])
    assert tree.delete(1) is False
    print("All tests passed.")
