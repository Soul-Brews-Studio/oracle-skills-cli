# Shebang Requires Executable Permission

**Date**: 2026-01-29
**Context**: /watch skill scripts failing with "permission denied"
**Confidence**: High

## Key Learning

A shebang line (`#!/usr/bin/env bun`) tells the shell which interpreter to use, but the shell won't even *attempt* to read the shebang unless the file has executable permission. Without the `+x` flag, you get "permission denied" before the shell ever sees what interpreter you wanted.

This is a common gotcha when creating scripts - you write the correct shebang, test with `bun script.ts` (which works because bun is invoked directly), then try `./script.ts` and wonder why it fails.

## The Pattern

```bash
# Creating a new script
cat > my-script.ts << 'EOF'
#!/usr/bin/env bun
console.log("Hello")
EOF

# This FAILS - no +x
./my-script.ts  # permission denied

# This WORKS - interpreter invoked directly
bun my-script.ts  # Hello

# Fix: add executable permission
chmod +x my-script.ts
./my-script.ts  # Hello
```

## Why This Matters

In the oracle-skills-cli project, skill scripts in `src/skills/*/scripts/` are meant to be run directly (e.g., `./get-metadata.ts url`). Without executable permission, they fail silently with a confusing error message.

**Prevention**:
1. Always `chmod +x` when creating scripts
2. Add CI/test that verifies all scripts have +x (we added `__tests__/permissions.test.ts`)
3. Document the requirement in project guidelines

## Tags

`bash`, `permissions`, `shebang`, `scripts`, `bun`, `executable`
