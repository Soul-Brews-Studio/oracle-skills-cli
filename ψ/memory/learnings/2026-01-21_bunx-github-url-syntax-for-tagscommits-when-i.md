---
title: ## bunx GitHub URL syntax for tags/commits
tags: [bunx, bun, github, package-management, syntax]
created: 2026-01-21
source: oracle-skills-cli v1.5.17 release session
---

# ## bunx GitHub URL syntax for tags/commits

## bunx GitHub URL syntax for tags/commits

When installing from GitHub with bunx, use `#` not `@` for refs:

```bash
# ✅ Correct - use # for tag/branch/commit
bunx pkg@github:org/repo#v1.5.17
bunx pkg@github:org/repo#main
bunx pkg@github:org/repo#c1007e0

# ❌ Wrong - @ doesn't work for refs
bunx pkg@github:org/repo@v1.5.17  # 404 error
```

The `@` after package name specifies the registry source (`github:`), while `#` specifies the git ref (tag, branch, or commit hash).

---
*Added via Oracle Learn*
