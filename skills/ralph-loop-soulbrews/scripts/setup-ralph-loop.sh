#!/bin/bash

# Ralph Loop Setup Script - Soul Brews Edition
# Creates state file for in-session Ralph loop with session isolation
#
# Source:
#   Base: anthropics/claude-plugins-official/plugins/ralph-loop/scripts/setup-ralph-loop.sh
#   Extended: Soul-Brews-Studio/ralph-local (session isolation)

set -euo pipefail

# === SOUL BREWS EXTENSION: Session Isolation ===
if [[ -n "${CLAUDE_PLUGIN_ROOT:-}" ]]; then
  STATE_DIR="$CLAUDE_PLUGIN_ROOT/state"
else
  STATE_DIR="$(dirname "$(dirname "$0")")/state"
fi

if [[ -z "${CLAUDE_SESSION_ID:-}" ]]; then
  echo "❌ Error: CLAUDE_SESSION_ID not available" >&2
  echo "   Ralph loop requires session isolation to work correctly." >&2
  echo "   This usually means the SessionStart hook didn't run." >&2
  echo "" >&2
  echo "   Try:" >&2
  echo "   1. Restart Claude Code" >&2
  echo "   2. Check plugin is properly installed" >&2
  exit 1
fi
# === END SOUL BREWS EXTENSION ===

# Parse arguments
PROMPT_PARTS=()
MAX_ITERATIONS=0
COMPLETION_PROMISE="null"

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      cat << 'HELP_EOF'
Ralph Loop - Soul Brews Edition (with session isolation)

USAGE:
  /ralph-loop [PROMPT...] [OPTIONS]

ARGUMENTS:
  PROMPT...    Initial prompt to start the loop

OPTIONS:
  --max-iterations <n>           Maximum iterations before auto-stop (default: unlimited)
  --completion-promise '<text>'  Promise phrase (USE QUOTES for multi-word)
  -h, --help                     Show this help message

DESCRIPTION:
  Starts a Ralph loop in your CURRENT session. The stop hook prevents
  exit and feeds your output back as input until completion or iteration limit.

  To signal completion, output: <promise>YOUR_PHRASE</promise>

EXAMPLES:
  /ralph-loop Build a todo API --completion-promise 'DONE' --max-iterations 20
  /ralph-loop --max-iterations 10 Fix the auth bug
  /ralph-loop Refactor cache layer  (runs forever)

SOUL BREWS EXTENSIONS:
  - Session isolation (per-session state files)
  - Multi-terminal safe
  - /check-updates command

STOPPING:
  Only by reaching --max-iterations or detecting --completion-promise

MONITORING:
  State file: $STATE_DIR/${CLAUDE_SESSION_ID}.md
HELP_EOF
      exit 0
      ;;
    --max-iterations)
      if [[ -z "${2:-}" ]]; then
        echo "❌ Error: --max-iterations requires a number argument" >&2
        exit 1
      fi
      if ! [[ "$2" =~ ^[0-9]+$ ]]; then
        echo "❌ Error: --max-iterations must be a positive integer, got: $2" >&2
        exit 1
      fi
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --completion-promise)
      if [[ -z "${2:-}" ]]; then
        echo "❌ Error: --completion-promise requires a text argument" >&2
        exit 1
      fi
      COMPLETION_PROMISE="$2"
      shift 2
      ;;
    *)
      PROMPT_PARTS+=("$1")
      shift
      ;;
  esac
done

PROMPT="${PROMPT_PARTS[*]}"

if [[ -z "$PROMPT" ]]; then
  echo "❌ Error: No prompt provided" >&2
  echo "   Examples:" >&2
  echo "     /ralph-loop Build a REST API for todos" >&2
  echo "     /ralph-loop Fix the auth bug --max-iterations 20" >&2
  exit 1
fi

# Create state directory and file (Soul Brews: session-isolated)
mkdir -p "$STATE_DIR"
RALPH_STATE_FILE="$STATE_DIR/${CLAUDE_SESSION_ID}.md"

# Quote completion promise for YAML
if [[ -n "$COMPLETION_PROMISE" ]] && [[ "$COMPLETION_PROMISE" != "null" ]]; then
  COMPLETION_PROMISE_YAML="\"$COMPLETION_PROMISE\""
else
  COMPLETION_PROMISE_YAML="null"
fi

cat > "$RALPH_STATE_FILE" <<EOF
---
active: true
iteration: 1
max_iterations: $MAX_ITERATIONS
completion_promise: $COMPLETION_PROMISE_YAML
started_at: "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
session_id: "$CLAUDE_SESSION_ID"
---

$PROMPT
EOF

# Output setup message
cat <<EOF
🔄 Ralph loop activated! (Soul Brews Edition)

Iteration: 1
Max iterations: $(if [[ $MAX_ITERATIONS -gt 0 ]]; then echo $MAX_ITERATIONS; else echo "unlimited"; fi)
Completion promise: $(if [[ "$COMPLETION_PROMISE" != "null" ]]; then echo "${COMPLETION_PROMISE//\"/} (ONLY output when TRUE!)"; else echo "none (runs forever)"; fi)
Session ID: ${CLAUDE_SESSION_ID:0:8}...

The stop hook is now active. When you try to exit, the SAME PROMPT will be
fed back to you. You'll see your previous work in files, creating a
self-referential loop where you iteratively improve on the same task.

To monitor: head -10 "$RALPH_STATE_FILE"

⚠️  WARNING: This loop runs infinitely unless you set --max-iterations or --completion-promise.

🔄
EOF

if [[ -n "$PROMPT" ]]; then
  echo ""
  echo "$PROMPT"
fi

if [[ "$COMPLETION_PROMISE" != "null" ]]; then
  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "CRITICAL - Ralph Loop Completion Promise"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  echo "To complete this loop, output this EXACT text:"
  echo "  <promise>$COMPLETION_PROMISE</promise>"
  echo ""
  echo "STRICT REQUIREMENTS:"
  echo "  ✓ Use <promise> XML tags EXACTLY as shown"
  echo "  ✓ The statement MUST be completely TRUE"
  echo "  ✓ Do NOT lie to escape the loop"
  echo "═══════════════════════════════════════════════════════════"
fi
