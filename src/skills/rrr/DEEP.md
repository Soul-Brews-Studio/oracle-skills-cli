# RRR --deep Mode (5 Parallel Agents)

**Use for complex sessions** with lots of changes, multiple features, or when you want comprehensive analysis.

## Step 0: Timestamp + Paths

```bash
date "+%H:%M %Z (%A %d %B %Y)"
ROOT="$(pwd)"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
DATE_PATH=$(date "+%Y-%m/%d")
mkdir -p "$ROOT/ψ/memory/retrospectives/$DATE_PATH"
```

## Step 1: Launch 5 Parallel Agents

Each agent prompt must include:
```
You are analyzing a coding session for retrospective.
ROOT: [ROOT]
Return your findings as text. The main agent will compile the retrospective.
```

### Agent 1: Git Deep Dive
```
Analyze git history thoroughly:
- git log --oneline -20
- git diff --stat HEAD~10
- git show --stat (last 5 commits)
- Branch activity
- Commit message patterns

Return: Timeline of changes, key commits, code churn analysis
```

### Agent 2: File Changes Analysis
```
Analyze what files changed and why:
- git diff --name-only HEAD~10
- Read key modified files
- Identify patterns in changes
- Architecture impact

Return: Files modified summary, architectural changes, risk areas
```

### Agent 3: Session Timeline Reconstruction
```
Reconstruct the session timeline:
- Read ψ/memory/logs/ for today
- Check git commit timestamps
- Identify session phases (start, middle, end)
- Map activities to times

Return: Detailed timeline with timestamps and activities
```

### Agent 4: Pattern & Learning Extraction
```
Extract patterns and learnings:
- What problems were solved?
- What techniques were used?
- What could be reused?
- What mistakes were made?

Return: Key patterns, learnings, mistakes, reusable solutions
```

### Agent 5: Oracle Memory Search
```
Search Oracle for related context:
- oracle_search("[session focus]")
- Check ψ/memory/learnings/ for similar topics
- Find past retrospectives on similar work
- What did we learn before?

Return: Related learnings, past insights, patterns to apply
```

## Step 2: Compile Results

After all agents return, main agent compiles into full retrospective:

**Location**: `ψ/memory/retrospectives/$DATE_PATH/${TIME}_[slug].md`

Include all standard sections PLUS:
- Deep git analysis (from Agent 1)
- Architecture impact (from Agent 2)
- Detailed timeline (from Agent 3)
- Extracted patterns (from Agent 4)
- Oracle connections (from Agent 5)

## Step 3: Write Lesson Learned

**Location**: `ψ/memory/learnings/${TODAY}_[slug].md`

With --deep, lesson learned should be more comprehensive:
- Multiple patterns identified
- Connections to past learnings
- Confidence levels for each insight

## Step 4: Sync to Oracle

```
oracle_learn({
  pattern: [Full lesson content],
  concepts: [tags from all 5 agents],
  source: "rrr --deep: [repo]"
})
```

## Step 5: Commit

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: deep analysis - [slug]"
```
