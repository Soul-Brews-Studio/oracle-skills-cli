#!/usr/bin/env bun
/**
 * Check if an oracle has a saved bot wallet/key.
 * Usage: bun get-oracle.ts <slug>
 * Output: JSON { exists, bot_wallet, bot_key } or { exists: false }
 * Standalone — no external dependencies.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

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

const slug = Bun.argv[2]
if (!slug) {
  console.error('Usage: bun get-oracle.ts <slug>')
  process.exit(1)
}

const o = await getOracle(slug)
if (o?.bot_key && o?.bot_wallet) {
  console.log(JSON.stringify({ exists: true, bot_wallet: o.bot_wallet, bot_key: o.bot_key }))
} else {
  console.log(JSON.stringify({ exists: false }))
}
