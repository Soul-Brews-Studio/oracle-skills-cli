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

## Session clock — the contract every host must satisfy

`/rrr` needs times, not a transcript. Any host that can attribute *when* things happened
should return a **SessionClock**; how it does so is that adapter's business.

```text
SessionClock {
  evidence: <adapter name> | none      # 'none' is a valid, honest answer
  segments: [{ start, end, minutes, beats: [HH:MM, ...] }]
}
```

Checklist an adapter must meet — satisfy these however the host allows:

- [ ] **Times are observed, never derived.** No estimating, no interpolating between known
      points, no tilde-hedged guesses.
- [ ] **Attributable.** Only this session, in this repository. If attribution is ambiguous,
      return `none` rather than the wrong conversation.
- [ ] **Gap-aware.** Split on idle gaps (60 min is a sane default) so an overnight pause is
      not reported as a nineteen-hour session.
- [ ] **Beats, not spans.** Report the minutes that actually had activity, so the retro can
      place rows on real events instead of spreading them evenly.
- [ ] **Cheap.** Read timestamps, not content. If obtaining times means loading the whole
      conversation into context, the adapter is too expensive — return `none` instead.
- [ ] **Degrades honestly.** No source → `evidence: none`, exit success. `/rrr` then falls
      back to git commit times, then to untimed ordered bullets.

`none` is not a failure. A retro that says `Duration: unknown` is correct; one that invents
`~04:12` is not.

## Claude Code adapter

When Claude Code's project-session JSONL is present and attributable to the current
repository, parse it as an internal adapter detail. Verify each record before reading
fields; malformed lines are skipped and reported. Do not copy the Claude path or schema
into the shared `/rrr` workflow.

Use Claude's available background-agent or team facility without requiring a fixed model
tier. If the facility is unavailable, follow the shared fallback contract.

**Session clock reference implementation.** `scripts/session-clock.py` satisfies the
contract above for this host: it substring-scans the project-session JSONL for timestamp
fields only — bodies are never parsed — so a 16MB transcript costs ~50ms and a few hundred
bytes. It is *an* implementation, not the mechanism: the Claude paths and `.jsonl` schema
live inside it precisely so they stay out of the shared flow.

Other hosts may reuse it by passing `--file <transcript>` if their artifact is
newline-delimited with ISO `"timestamp":"..."` fields — otherwise write your own; the
contract is what matters.

## Codex adapter

Prefer a host-provided session handle or native session context. If Codex exposes a
persisted rollout/session artifact, use it only after confirming that it belongs to the
current session and repository.

For the session clock: derive times from whatever Codex actually exposes — rollout file
mtimes, a session API, native turn metadata. Do not invoke the Claude reference script
against a Codex layout on the assumption that it matches. If no attributable time source
exists, return `evidence: none`; that is the correct answer, not a shortfall. Treat its location and schema as version-dependent; do
not assume Claude's directory layout or message schema.

Use Codex native role routing for delegated work when available. Do not imitate Claude
tool syntax in Codex instructions. If asynchronous work cannot survive the parent turn,
report background execution as unavailable and use the documented fallback.

## Unknown hosts

Use current context and repository evidence. Set the evidence source to `context-only`
or `unknown`, session ID to `unknown`, and disclose that persisted-session enrichment was
unavailable. Never search arbitrary home-directory logs hoping to find a transcript.

Session clock: `evidence: none`. Git commit times remain available in every mode and are
often enough on their own.

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
