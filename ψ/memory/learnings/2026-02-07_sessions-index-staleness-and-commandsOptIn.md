# Lessons Learned: 2026-02-07

## sessions-index.json is stale (~25% coverage)

`~/.claude/projects/{path}/sessions-index.json` only indexed 10 out of 40 actual `.jsonl` session files for oracle-skills-cli. The index is rebuilt lazily by Claude Code and doesn't track all sessions.

**Implication**: Never trust sessions-index.json for complete data. Count `.jsonl` files directly for accurate session counts. Use the index only for enrichment (summaries, branch names) since it has parsed metadata that .jsonl files don't expose as easily.

**Pattern**: `ls ~/.claude/projects/{path}/*.jsonl | wc -l` for count, `sessions-index.json` for summaries.

## commandsOptIn pattern for multi-agent features

When generalizing a feature from one agent (OpenCode) to another (Claude Code), use an opt-in flag so existing install behavior doesn't change:

```typescript
// types.ts
commandsOptIn?: boolean; // Only install commands with --commands flag

// agents.ts
'claude-code': { commandsOptIn: true }  // opt-in
'opencode': { /* no flag = always */ }   // default behavior preserved

// installer.ts
if (agent.commandsDir && (!agent.commandsOptIn || options.commands)) {
```

This lets Claude Code users explicitly request `--commands` while OpenCode keeps its existing behavior untouched.

## Design through conversation > design upfront

The oracle-pulse skill went through 4 revisions in one session:
1. Pure display (3 separate modes)
2. Added explicit data layer (snapshots)
3. Split into fast read-only + slow --dig write mode
4. Merged default + --project into single default

Each revision was driven by a 3-5 word user insight. The final design is better than any plan could have produced alone.
