# RRR Host Capability Guide

Use this guide only for `/rrr --bg` or `/rrr --combo`. `/rrr --fg` deliberately does
not inspect persisted session data.

## Capability detection

Detect behavior from available host tools and readable sources; do not infer it only
from which installation directory contains the skill.

Record these capabilities:

```text
HostCapabilities {
  host: claude | codex | other
  background_agents: supported | unavailable
  persisted_session: supported | unavailable
  session_source?: absolute path or host-native handle
}
```

Do not expose raw conversation contents, credentials, secrets, or unrelated sessions in
the retrospective.

## Normalized evidence

Every adapter returns the same conceptual record:

```text
SessionEvidence {
  session_id?: string
  started_at?: timestamp
  ended_at?: timestamp
  events: [{ timestamp?: timestamp, role, summary }]
  source: claude | codex | context-only | unknown
}
```

Only retain events attributable to the current repository/session. Summaries should be
short and must not reproduce secrets. Preserve timestamps exactly, converting only for
display in the configured timezone.

## Claude Code adapter

When Claude Code's project-session JSONL is present and attributable to the current
repository, parse it as an internal adapter detail. Verify each record before reading
fields; malformed lines are skipped and reported. Do not copy the Claude path or schema
into the shared `/rrr` workflow.

Use Claude's available background-agent or team facility without requiring a fixed model
tier. If the facility is unavailable, follow the shared fallback contract.

## Codex adapter

Prefer a host-provided session handle or native session context. If Codex exposes a
persisted rollout/session artifact, use it only after confirming that it belongs to the
current session and repository. Treat its location and schema as version-dependent; do
not assume Claude's directory layout or message schema.

Use Codex native role routing for delegated work when available. Do not imitate Claude
tool syntax in Codex instructions. If asynchronous work cannot survive the parent turn,
report background execution as unavailable and use the documented fallback.

## Unknown hosts

Use current context and repository evidence. Set the evidence source to `context-only`
or `unknown`, session ID to `unknown`, and disclose that persisted-session enrichment was
unavailable. Never search arbitrary home-directory logs hoping to find a transcript.

## Failure behavior

- Missing or unreadable session source: continue without it and disclose the limitation.
- Ambiguous repository/session attribution: reject the source rather than mining the
  wrong conversation.
- Malformed event: skip it, count it, and do not invent replacement data.
- Background launch failure: do the documented foreground fallback.
- Partial `--combo` enrichment: preserve the foreground artifact and change its marker
  from `pending` to `unavailable` or `partial`, including the reason.

All fallbacks are explicit. A missing capability must never look like successful mining
or a still-running background job.
