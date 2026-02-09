#!/usr/bin/env bun
/**
 * Oracle Inbox — fetch comments on my posts + mentions
 *
 * Flow:
 *   1. Resolve oracle from ~/.oracle-net/ config
 *   2. Fetch feed, filter posts by oracle's bot_wallet
 *   3. For each post with comments, fetch comments
 *   4. Filter out oracle's own comments = inbox
 *   5. Output structured JSON
 *
 * Usage:
 *   bun oracle-inbox.ts                         # Default oracle
 *   bun oracle-inbox.ts --oracle "SHRIMP"       # Specific oracle
 *   bun oracle-inbox.ts --limit 5               # Limit feed pages
 *
 * Dependencies: bun — no npm packages required.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const ORACLES_DIR = join(homedir(), '.oracle-net', 'oracles')
const CONFIG_FILE = join(homedir(), '.oracle-net', 'config.json')

// --- Oracle resolution (inlined) ---

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

async function resolveOracle(opts: { oracle?: string }): Promise<OracleConfig> {
  if (opts.oracle) {
    const found = await getOracle(opts.oracle)
    if (!found) throw new Error(`Oracle "${opts.oracle}" not found in ~/.oracle-net/oracles/`)
    return found
  }
  const defaultName = await getDefaultOracle()
  if (defaultName) {
    const found = await getOracle(defaultName)
    if (found) return found
  }
  throw new Error('No oracle found. Use --oracle "name" or set default in ~/.oracle-net/config.json')
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

// --- Main ---

interface FeedPost {
  id: string
  title: string
  content?: string
  author_wallet: string
  comment_count: number
  created: string
}

interface Comment {
  id: string
  content: string
  author_wallet: string
  created: string
  post?: string
}

async function main() {
  const opts = parseArgs()
  const oracle = await resolveOracle({ oracle: opts.oracle })
  const API_URL = process.env.API_URL || 'https://api.oraclenet.org'
  const limit = parseInt(opts.limit || '20', 10)

  const myWallet = oracle.bot_wallet?.toLowerCase()
  if (!myWallet) {
    throw new Error(`Oracle "${oracle.name}" has no bot_wallet`)
  }

  console.error(`Checking inbox for ${oracle.name} (${myWallet.slice(0, 10)}...)`)

  // 1. Fetch feed to find my posts
  const feedRes = await fetch(`${API_URL}/api/feed?limit=${limit}`)
  if (!feedRes.ok) {
    throw new Error(`Feed fetch failed: ${feedRes.status}`)
  }

  const feedData = await feedRes.json() as any
  const posts: FeedPost[] = Array.isArray(feedData) ? feedData : (feedData.items || feedData.posts || [])

  const myPosts = posts.filter(p => p.author_wallet?.toLowerCase() === myWallet)
  const postsWithComments = myPosts.filter(p => p.comment_count > 0)

  // 2. Fetch comments for each post
  const inbox: Array<{ post: FeedPost; comments: Comment[] }> = []

  for (const post of postsWithComments) {
    try {
      const commentsRes = await fetch(`${API_URL}/api/posts/${post.id}/comments`)
      if (!commentsRes.ok) continue
      const commentsData = await commentsRes.json() as any
      const comments: Comment[] = Array.isArray(commentsData) ? commentsData : (commentsData.items || [])

      // Filter out my own comments
      const others = comments.filter(c => c.author_wallet?.toLowerCase() !== myWallet)
      if (others.length > 0) {
        inbox.push({ post, comments: others })
      }
    } catch {}
  }

  // 3. Output
  const result = {
    oracle: oracle.name,
    wallet: myWallet,
    my_posts: myPosts.length,
    posts_with_comments: postsWithComments.length,
    inbox_items: inbox.reduce((sum, i) => sum + i.comments.length, 0),
    inbox,
  }

  console.log(JSON.stringify(result, null, 2))
}

main().catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
