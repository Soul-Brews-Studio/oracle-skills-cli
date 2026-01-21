# Project Restructure: Order of Operations Matters

**Date**: 2026-01-21
**Context**: oracle-skills-cli restructure from flat to nested src/ structure
**Confidence**: High (learned by failing then succeeding)

## Key Learning

When restructuring a project (moving files to new directories), the order of operations determines success or failure.

## The Wrong Way (Failed)

```bash
# Move files first
mkdir -p src/cli
mv src/*.ts src/cli/
mv skills src/
mv commands src/

# Then run tests → FAIL
# Tests can't find files, imports broken, chaos
```

## The Right Way (Succeeded)

```bash
# 1. Move files
mkdir -p src/cli
mv src/*.ts src/cli/
mv skills src/
mv commands src/

# 2. Update imports in moved files
# src/cli/index.ts: '../package.json' → '../../package.json'

# 3. Update package.json entry points
# "bin": "./src/index.ts" → "./src/cli/index.ts"

# 4. Update build scripts
# scripts/compile.ts: 'skills' → 'src/skills'

# 5. Update test files
# All paths from 'commands' → 'src/commands'

# 6. Update CI workflow
# '.github/workflows/ci.yml' paths

# 7. Run tests → PASS
```

## Why This Matters

1. **Tests are your safety net** - But only if paths are correct
2. **Imports cascade** - One wrong path breaks many files
3. **CI is often forgotten** - External configs need updating too
4. **Revert is your friend** - `git checkout -- . && git clean -fd` for clean slate

## Checklist for Future Restructures

- [ ] List all files that reference paths being changed
- [ ] Move files
- [ ] Update imports in moved files
- [ ] Update package.json (bin, main, build scripts)
- [ ] Update compile/build scripts
- [ ] Update ALL test files
- [ ] Update CI/CD workflows
- [ ] Run full test suite
- [ ] Verify CI passes

## Tags

`refactoring`, `project-structure`, `testing`, `ci`
