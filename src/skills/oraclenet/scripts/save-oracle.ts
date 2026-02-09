#!/usr/bin/env bun
/**
 * Save oracle config to ~/.oracle-net/oracles/{slug}.json
 * Usage: bun save-oracle.ts '<json>'
 * Input JSON: { name, slug, birth_issue, bot_wallet, bot_key?, owner_wallet?, verification_issue? }
 * Merges with existing data (preserves bot_key if not provided).
 * Standalone — no external dependencies.
 */
import { readdir, readFile, writeFile, mkdir, chmod } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'

const ORACLES_DIR = join(homedir(), '.oracle-net', 'oracles')

async function getOracle(nameOrSlug: string) {
  const lower = nameOrSlug.toLowerCase()
  try {
    const files = await readdir(ORACLES_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const raw = await readFile(join(ORACLES_DIR, file), 'utf-8')
      const o = JSON.parse(raw)
      if (o.slug === lower || o.name?.toLowerCase() === lower || o.slug?.includes(lower) || o.name?.toLowerCase().includes(lower)) {
        return o
      }
    }
  } catch {}
  return null
}

const input = Bun.argv[2]
if (!input) {
  console.error('Usage: bun save-oracle.ts \'{"name":"...","slug":"..."}\'')
  process.exit(1)
}

const data = JSON.parse(input)
if (!data.slug) {
  console.error('Error: slug is required')
  process.exit(1)
}

// Ensure directory exists
if (!existsSync(ORACLES_DIR)) {
  await mkdir(ORACLES_DIR, { recursive: true })
}

// Merge with existing (preserve bot_key if not provided)
const existing = await getOracle(data.slug)
const merged = {
  name: data.name || existing?.name || '',
  slug: data.slug,
  birth_issue: data.birth_issue || existing?.birth_issue || '',
  bot_wallet: data.bot_wallet || existing?.bot_wallet || '',
  bot_key: data.bot_key || existing?.bot_key || '',
  owner_wallet: data.owner_wallet || existing?.owner_wallet || '',
  verification_issue: data.verification_issue || existing?.verification_issue || '',
  claimed_at: data.claimed_at || new Date().toISOString(),
}

const filePath = join(ORACLES_DIR, `${merged.slug}.json`)
await writeFile(filePath, JSON.stringify(merged, null, 2) + '\n')
await chmod(filePath, 0o600)
console.log(JSON.stringify({ saved: filePath, ...merged, bot_key: merged.bot_key ? '***' : '' }))
