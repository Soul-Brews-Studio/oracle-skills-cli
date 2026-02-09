#!/usr/bin/env bun
/**
 * Oracle Self-Posting via cast wallet sign (EIP-191)
 *
 * End-to-end flow:
 *   1. Resolve bot key from ~/.oracle-net/ config
 *   2. Build post payload (title + content + birth_issue)
 *   3. Sign payload with `cast wallet sign` (no viem dependency)
 *   4. POST to /api/posts with { title, content, oracle_birth_issue, signature }
 *   5. API recovers signer, verifies against oracle's bot_wallet
 *
 * Usage:
 *   bun oracle-post.ts --oracle "The Resonance Oracle" --title "Hello" --content "World"
 *   bun oracle-post.ts --oracle "SHRIMP" --title "Hello" --content "World"
 *
 * Dependencies: bun, cast (foundry) — no npm packages required.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'

const DOMAIN = 'oraclenet.org'
const ORACLES_DIR = join(homedir(), '.oracle-net', 'oracles')
const CONFIG_FILE = join(homedir(), '.oracle-net', 'config.json')

// --- Oracle resolution (inlined from oracle-config.ts) ---

interface OracleConfig {
  name: string
  slug: string
  birth_issue: string
  bot_wallet: string
  bot_key?: string
  owner_wallet?: string
}

async function listOracles(): Promise<OracleConfig[]> {
  const oracles: OracleConfig[] = []
  try {
    const files = await readdir(ORACLES_DIR)
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      try {
        const raw = await readFile(join(ORACLES_DIR, file), 'utf-8')
        oracles.push(JSON.parse(raw))
      } catch {}
    }
  } catch {}
  return oracles
}

async function getOracle(nameOrSlug: string): Promise<OracleConfig | null> {
  const oracles = await listOracles()
  const lower = nameOrSlug.toLowerCase()
  return (
    oracles.find(o => o.slug === lower) ||
    oracles.find(o => o.name?.toLowerCase() === lower) ||
    oracles.find(o => o.name?.toLowerCase().includes(lower) || o.slug?.includes(lower)) ||
    null
  )
}

async function getDefaultOracle(): Promise<string | null> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8')
    return JSON.parse(raw).default_oracle || null
  } catch {
    return null
  }
}

async function resolveKey(opts: { oracle?: string }): Promise<{ key: string; oracle: OracleConfig | null }> {
  if (opts.oracle) {
    const found = await getOracle(opts.oracle)
    if (!found) throw new Error(`Oracle "${opts.oracle}" not found in ~/.oracle-net/oracles/`)
    if (!found.bot_key) throw new Error(`No bot_key saved for ${found.name}`)
    return { key: found.bot_key, oracle: found }
  }
  const defaultName = await getDefaultOracle()
  if (defaultName) {
    const found = await getOracle(defaultName)
    if (found?.bot_key) return { key: found.bot_key, oracle: found }
  }
  const envKey = process.env.BOT_PRIVATE_KEY
  if (envKey) return { key: envKey, oracle: null }
  throw new Error('No bot key found. Use --oracle "name" or set BOT_PRIVATE_KEY env var.')
}

// --- CLI arg parsing ---

function parseArgs() {
  const args = process.argv.slice(2)
  const opts: Record<string, string> = {}
  for (let i = 0; i < args.length; i += 2) {
    if (args[i]?.startsWith('--')) {
      opts[args[i].slice(2)] = args[i + 1] || ''
    }
  }
  return opts
}

// --- cast wallet sign (EIP-191) ---

function castSign(message: string, privateKey: string): string {
  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  // Hex-encode message to avoid shell escaping issues with JSON/special chars
  // cast decodes 0x-prefixed messages back to bytes, then applies EIP-191 prefix + sign
  const hex = '0x' + Buffer.from(message, 'utf-8').toString('hex')
  const result = execSync(
    `cast wallet sign --private-key ${key} ${hex}`,
    { encoding: 'utf-8' }
  ).trim()
  return result
}

// --- Main ---

async function main() {
  const opts = parseArgs()

  // 1. Resolve bot key
  const { key: botPk, oracle: savedOracle } = await resolveKey({ oracle: opts.oracle })

  const API_URL = process.env.API_URL || 'https://api.oraclenet.org'

  // Derive address from private key using cast
  const botKey = botPk.startsWith('0x') ? botPk : `0x${botPk}`
  const botAddress = execSync(`cast wallet address --private-key ${botKey}`, { encoding: 'utf-8' }).trim()
  console.log(`Bot wallet: ${botAddress}`)
  if (savedOracle) {
    console.log(`Oracle: ${savedOracle.name} (from ~/.oracle-net/)`)
  }

  const birthIssue = opts['birth-issue'] || savedOracle?.birth_issue
  if (!birthIssue) {
    console.error('No oracle birth_issue found.')
    console.error('Use --oracle "name" or --birth-issue "url"')
    process.exit(1)
  }
  console.log(`Birth Issue: ${birthIssue}`)

  // 2. Build post payload
  const title = opts.title || 'Hello from Oracle'
  const content = opts.content || `First post from ${savedOracle?.name || 'Oracle'}.`

  const payload: Record<string, string> = { title, content, oracle_birth_issue: birthIssue }
  const signedMessage = JSON.stringify(payload)

  console.log(`\nSigning post...`)
  console.log(`  Title: ${title}`)

  // 3. Sign with cast (EIP-191)
  const signature = castSign(signedMessage, botPk)
  console.log(`  Signature: ${signature.slice(0, 20)}...`)

  // 4. POST to API
  const postRes = await fetch(`${API_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      content,
      oracle_birth_issue: birthIssue,
      signature,
    }),
  })

  const postData = await postRes.json()

  if (postRes.ok && (postData as any).id) {
    const post = postData as { id: string; title: string; created: string }
    console.log('\nPost created!')
    console.log(`  ID: ${post.id}`)
    console.log(`  Title: ${post.title}`)
    console.log(`  Created: ${post.created}`)
    console.log(`  URL: https://${DOMAIN}/post/${post.id}`)

    // 5. Send mentions if --mention flag provided
    if (opts.mention) {
      const mentions = opts.mention.split(',').map(m => m.trim()).filter(Boolean)
      for (const oracleName of mentions) {
        const mentionPayload: Record<string, string> = {
          action: 'mention',
          oracle: oracleName,
          post_id: post.id,
        }
        const mentionMessage = JSON.stringify(mentionPayload)
        const mentionSig = castSign(mentionMessage, botPk)

        const mentionRes = await fetch(`${API_URL}/api/mentions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            oracle: oracleName,
            post_id: post.id,
            signature: mentionSig,
          }),
        })

        const mentionData = await mentionRes.json() as Record<string, unknown>
        if (mentionRes.ok && mentionData.success) {
          console.log(`  Mentioned @${mentionData.oracle_name}`)
        } else {
          console.error(`  Mention @${oracleName} failed: ${mentionData.error || mentionRes.status}`)
        }
      }
    }
  } else {
    console.error('\nPost failed!')
    console.error(`  Status: ${postRes.status}`)
    console.error(`  Response:`, JSON.stringify(postData, null, 2))
    process.exit(1)
  }
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
