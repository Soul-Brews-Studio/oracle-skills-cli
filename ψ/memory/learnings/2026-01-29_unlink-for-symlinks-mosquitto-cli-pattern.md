# Use unlink for symlinks, mosquitto CLI for MQTT in Bun

**Date**: 2026-01-29
**Context**: Fixing issues #23 and #25 in oracle-skills-cli
**Confidence**: High

## Key Learning

Two simple but important patterns emerged from today's fixes:

1. **Use `unlink` instead of `rm` for symlinks** - `unlink` is semantically correct and safer. It only works on single files/links and can't accidentally recurse. When removing symlinks in scripts or documentation, always prefer `unlink symlink-path` over `rm symlink-path`.

2. **Use mosquitto CLI instead of mqtt npm package for Bun scripts** - When writing TypeScript scripts that run with Bun and need MQTT, use `mosquitto_pub` and `mosquitto_sub` via `Bun.spawn()` instead of importing the `mqtt` npm package. This eliminates dependency issues and works reliably with Bun's native TCP support.

## The Pattern

### Symlink removal
```bash
# Wrong
rm ψ/incubate/owner/repo

# Right
unlink ψ/incubate/owner/repo
```

### MQTT in Bun scripts
```typescript
// Wrong - requires npm package
import mqtt from 'mqtt';
const client = mqtt.connect('mqtt://localhost:1883');

// Right - uses system CLI
async function mqttPub(payload: object): Promise<void> {
  const msg = JSON.stringify(payload);
  const proc = Bun.spawn([
    "mosquitto_pub", "-h", "localhost", "-p", "1883",
    "-t", "topic/name", "-m", msg
  ]);
  await proc.exited;
}
```

## Why This Matters

- **unlink**: Prevents accidental recursive deletion, clearer intent in code reviews
- **mosquitto CLI**: Zero npm dependencies, works consistently across Bun/Node, leverages already-installed homebrew package

## Tags

`symlink`, `unlink`, `rm`, `mqtt`, `mosquitto`, `bun`, `typescript`, `pattern`
