---
name: update
description: Check and update oracle-skills to latest version. Use when user says "update", "upgrade", "check version", or wants latest skills.
---

# /update - Update Oracle Skills

> "Stay current, stay connected to the family."

## Usage

```
/update              # Check version and update if needed
/update --check      # Only check, don't update
```

## Step 0: Timestamp
```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

---

## Step 1: Check Current Version

Your current version is shown in the skill description above (e.g., `v1.5.34 G-SKLL`).

Extract just the version number:
```bash
# Current version from this skill's description
CURRENT="v1.5.34"  # Read from description above
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
  echo "✅ You're up to date! ($CURRENT)"
else
  echo "⚠️ Update available: $CURRENT → $LATEST"
fi
```

---

## Step 4: Update (if needed)

If versions differ, run:

```bash
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#$LATEST install -g -y
```

Then **restart Claude Code** to load the new skills.

---

## Step 5: Verify Update

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
| `/update` | Check and update |
| `/update --check` | Check only |
| `/awaken` | Re-awaken (also checks version) |

---

ARGUMENTS: $ARGUMENTS
