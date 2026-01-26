# Sugar Alias Pattern for Skills

**Date**: 2026-01-27
**Context**: oracle-skills-cli skill refactoring
**Confidence**: High

## Key Learning

When creating multiple names for the same skill (e.g., `/soul-sync` and `/update`), establish a clear base/alias hierarchy:

1. **Base skill**: Full documentation, all steps, complete content
2. **Sugar alias**: Minimal file that points to base

This prevents documentation drift and reduces maintenance burden.

## The Pattern

**Base skill** (`/soul-sync`):
```markdown
---
name: soul-sync
description: Sync Oracle instruments with the family...
---

# /soul-sync - Sync with Oracle Family

> "Sync your soul with the family."

## Usage
/soul-sync           # Check version and update
/update              # Same (sugar alias)
/calibrate           # Same (sugar alias)

## Step 1: ...
[full documentation]
```

**Sugar alias** (`/update`):
```markdown
---
name: update
description: Check and update oracle-skills...
---

# /update

> Sugar alias for `/soul-sync`

**Just run `/soul-sync`** — this is the practical version.

See `/soul-sync` for complete documentation.
```

## Why This Matters

- **Single source of truth**: Only update one file
- **No drift**: Aliases can't become outdated
- **Clear hierarchy**: Users know which is "canonical"
- **Ritual vs practical**: Spiritual names (/soul-sync) are base, practical names (/update) are sugar

## Applied In

| Base | Aliases |
|------|---------|
| `/soul-sync` | `/update`, `/calibrate` |
| `/who-are-you` | (none, /who removed) |
| `/rrr` | `/retrospective` |

## Tags

`skills`, `aliases`, `pattern`, `documentation`, `maintenance`
