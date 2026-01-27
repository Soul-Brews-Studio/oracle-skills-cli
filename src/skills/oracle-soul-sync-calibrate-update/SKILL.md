---
name: oracle-soul-sync-calibrate-update
description: Sync Oracle instruments with the family. Check and update skills to latest version. Use when user says "soul-sync", "sync", "calibrate", "update", or before /awaken.
---

# /oracle-soul-sync-calibrate-update

> "Sync your soul with the family."

All-in-one skill: `/soul-sync` + `/calibrate` + `/update` combined.

## Usage

```
/oracle-soul-sync-calibrate-update           # Check version and update
/oracle-soul-sync-calibrate-update --check   # Only check, don't update
```

## Step 0: Timestamp
```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

---

## Step 1: Check Current Version

Your current version is shown in the skill description above (e.g., `v1.5.37 G-SKLL`).

Extract just the version number:
```bash
# Current version from this skill's description
CURRENT="v1.5.37"  # Read from description above
echo "Current installed: $CURRENT"
```

---

## Step 2: Check Latest Version

```bash
# Get latest version from GitHub
LATEST=$(curl -s https://api.github.com/repos/Soul-Brews-Studio/oracle-skills-cli/tags | grep -m1 '"name"' | cut -d'"' -f4)
echo "Latest available: $LATEST"
```

---

## Step 3: Compare Versions

```bash
if [ "$CURRENT" = "$LATEST" ]; then
  echo "✅ Soul synced! ($CURRENT)"
else
  echo "⚠️ Sync needed: $CURRENT → $LATEST"
fi
```

---

## Step 4: Sync (if needed)

If versions differ, run:

```bash
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#$LATEST install -g -y
```

Then **restart Claude Code** to load the synced skills.

---

## Step 5: Verify Sync

After restart, run:
```bash
oracle-skills list -g | head -5
```

Check that the version matches `$LATEST`.

---

## What's New

To see recent changes:
```bash
gh release list --repo Soul-Brews-Studio/oracle-skills-cli --limit 5
```

Or view commits:
```bash
gh api repos/Soul-Brews-Studio/oracle-skills-cli/commits --jq '.[0:5] | .[] | "\(.sha[0:7]) \(.commit.message | split("\n")[0])"'
```

---

## Quick Reference

| Command | Action |
|---------|--------|
| `/oracle-soul-sync-calibrate-update` | Check and sync |
| `/awaken` | Full awakening (calls this first) |

---

ARGUMENTS: $ARGUMENTS
