---
name: verification-gate-fail-closed
description: Reference for building verification gates with fail-closed design - when verification tools fail, mark results as UNVERIFIED and report clearly, never silent pass-through
hidden: true
metadata:
  internal: true
---

# Verification Gate: Fail-Closed Design

> "A gate that breaks silently is worse than no gate."

## Overview

A verification gate that silently passes when the verification tool breaks is not a gate—it's a security vulnerability.

**Core principle:** Verification tools can fail. When they do, you must mark results as UNVERIFIED and report the failure clearly. Silent pass-through creates false confidence.

**Violating the letter of fail-closed design is violating the spirit of safety.**

## When to Use

- Building orchestrators, pipelines, or gates that check work before marking it complete
- Integrating verification tools (OCR validators, cross-model checkers, fact-check services)
- Any place where "tool passed" becomes a claim in a manifest, report, or downstream decision
- When tool failure (network error, timeout, API limit, parsing failure) is possible
- Marking batches or manifests as "verified" based on tool output

**When NOT to use:**
- Simple linear validation (if [check], then [proceed]) - use error handling instead
- Verification where tool failure causes immediate hard stop (use try/catch + propagate error)
- Cases where unverified results cannot flow downstream

---

## The Gate Function (5 Steps)

```
BEFORE marking any output as "verified" or "passed":

1. INVOKE: Call verification tool with full context
2. WAIT: Let tool finish completely (no timeouts before completion)
3. PARSE: Extract result AND error codes/messages (not just final status)
4. DECIDE: 
   - If tool succeeded: Mark as VERIFIED + record evidence
   - If tool failed: Mark as UNVERIFIED + record failure reason
5. REPORT: Always distinguish verified/unverified/skipped/failed in output

Skip or hide any step = hidden vulnerability, not efficiency
```

---

## Red Flags — STOP

Watch for these patterns when designing gates. **These are errors:**

- Tool error → gate returns `success: true` (silent fail-through)
- Tool timeout → skip verification, proceed anyway
- Network error → assume tool would have passed
- Tool returns partial results → treat as full verification
- Agent reports "success" → trust without checking tool status
- Manifest counts skipped items as "verified"
- Any code path where tool error doesn't set result to UNVERIFIED
- "Tool probably would pass if it ran correctly"
- Proceeding when verification status is uncertain

---

## Rationalization Prevention

Real excuses Oracles have made (and why they're wrong):

| Excuse | Reality | Oracle Lesson |
|--------|---------|---------------|
| "Tool error doesn't mean data is wrong" | Correct. But YOU don't know if it's right either. Mark UNVERIFIED. | Ink translate_book.sh:75: agy crashed → Ink kept raw file → reported as verified |
| "We can skip verification for this batch" | Verification exists to catch what you can't see. Skipping defeats the purpose. | OCR 94% confident → team skipped manual review → shipped 80% wrong |
| "Subagent reported success" | Subagent ≠ verification tool. If tool actually failed, agent's report is fiction. | earthPGS mining: agent said "all verified" → tool logs showed 40% failed |
| "Tool was flaky, so this might pass next time" | "Might" ≠ "is verified". Mark UNVERIFIED. | Vid proof1 fail-closed: must mark false-positive as UNVERIFIED not "probably works" |
| "Partial screenshot covered the key part" | You didn't verify the whole output. You verified what you SAW. Mark that scope. | Evidence before claims: only mark what you actually checked |
| "Manifest says verified, so assume rest are too" | Manifest is a claim. Check the tool logs. | CSO lesson: description of tool ≠ tool actually running |
| "Different gate tool, different standard" | All gates must fail-closed. Standard is: tool failure = UNVERIFIED. | Pagis fact-check gate, Ink OCR gate, Vid proof gate: same law applies |

---

## Oracle-Specific Implementation

### UNVERIFIED Marking

When verification tool fails (error, timeout, crash, API blocked, parse failure):

```
Record result as:
{
  status: "UNVERIFIED",
  reason: "[specific failure: 'agy timeout 60s' | 'network 429' | 'parse error row 42' | 'tool crashed']",
  attempted: true,
  tool_exit_code: [actual code or error],
  evidence: [what we were able to check before failure]
}
```

**Never:**
```
# BAD: silently passes
return success if tool_error_code exists

# BAD: assumes tool would pass
if network_error then continue
```

### Manifest Honesty

Manifest must distinguish three categories:

```
total_items: 100
verified: 42        # Tool completed, returned pass
unverified: 18      # Tool failed/timed out/partial
skipped: 40         # Deliberately skipped (not a gate failure)
failed: 0           # Tool ran, explicitly marked as failed

# Report ONLY:
passed_percentage = verified / total_items   (not verified+skipped!)
verification_status = "incomplete" if unverified > 0
```

**Why:** A manifest reporting "94% verified" but skipping 40% creates false confidence. The actual passed rate is 42%.

### Linked to Cross-Model Verification

Fail-closed gates pair with **cross-model-verify** pattern: if one tool flags UNVERIFIED, dispatch second tool to decide. But both tools failing = UNVERIFIED (not "stalemate means pass").

---

## Spirit vs Letter

**Violating the letter = violating the spirit.**

- Tool crashes but "data looks right" → still UNVERIFIED
- Tool timeout but "data was 99% checked" → still UNVERIFIED
- Skipping whole category but "important items were checked" → still UNVERIFIED

If you didn't complete verification, don't claim you did.

---

## Common Implementation Failures

| Failure | Fix |
|---------|-----|
| Tool error silently ignored | Catch errors, set status to UNVERIFIED |
| Timeout continues anyway | Wait for timeout, set UNVERIFIED |
| Manifest counts skipped as verified | Separate verified / skipped / unverified categories |
| Report hides failure reason | Include failure_reason field in output |
| No evidence when tool fails | Record what we learned before tool broke |
| Mixed verification methods | All methods follow same fail-closed rule |
| "Probably correct" assumptions | Confidence ≠ verification. Mark UNVERIFIED. |

---

## Real-World Examples

**Ink OCR Verification Gate (from memory):**
- agy (Gemini) crashes during recheck
- Gate caught this: set status → UNVERIFIED
- Did NOT: skip verification, keep raw file, continue silently
- Result: blocked bad OCR, forced retry with diagnostics

**Vid Proof1 Gate (from memory):**
- Verification returned false-positive (marked pass, was actually fail)
- Gate caught this: marked UNVERIFIED until Proof 1 actually passed (3/4)
- Did NOT: trust first pass, assume two-signal rule meant "verified"
- Result: prevented shipping broken proof chain

**OCR Confidence Trap (from memory):**
- Tool reported "94% confident"
- Team assumption: skip manual review
- Reality: 80% was wrong (80% false positive rate)
- Lesson: tool confidence ≠ verification. Only tool passing = verified.

---

## Implementation Checklist

When you build a gate:

- [ ] Tool success path → set status VERIFIED
- [ ] Tool timeout → set UNVERIFIED + record timeout
- [ ] Tool error/crash → set UNVERIFIED + record error code + reason
- [ ] Network error → set UNVERIFIED + record network error
- [ ] Tool returns partial results → record scope + set UNVERIFIED if scope incomplete
- [ ] All paths report to manifest with clear categories
- [ ] Manifest never counts UNVERIFIED as verified
- [ ] Manifest never counts SKIPPED as unverified
- [ ] Downstream consumer sees clear signal: "verified" or "unverified" (not "unknown")
- [ ] No silent pass-through paths
- [ ] Test: break the tool, verify gate marks UNVERIFIED

---

## The Bottom Line

**Tool fails → mark UNVERIFIED. Report it clearly. Let downstream decide what to do with unverified work.**

This is fail-closed design: explicit about uncertainty, not comfortable with it.
