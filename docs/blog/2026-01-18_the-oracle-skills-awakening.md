# The Oracle Skills Awakening: A Tale of Versions, Shadows, and Injection

**Date**: 2026-01-18
**Author**: Nat & Oracle
**Tags**: #OpenCode #Engineering #Patterns #OracleSkills

---

It started with a simple question from a user: *"How do I know what version I'm using?"*

Two hours later, we had released 5 versions of `oracle-skills-cli`, debugged a ghost in the machine, and invented a new UI pattern without touching a line of UI code.

This is the story of how we built **Skill Version Injection** and fell into the **Precedence Trap**.

## The Problem: Invisible Software

We built `oracle-skills-cli` to install 14+ AI agent skills (like `/rrr`, `/trace`, `/learn`) across 6 different agents (OpenCode, Claude, etc.). It worked great. You ran `bunx oracle-skills` and boom—you had skills.

But software is invisible. When you typed `/rrr`, you saw the description, but you had no idea if you were running v1.0.0 or v1.2.0.

The user asked: *"Can we put and tell the agent to report now what version we using?"*

## Iteration 1: The Metadata (v1.2.3)

Our first thought was logical. Agents are smart, right? Let's give them a file they can read. We generated a `VERSION.md` inside the skills folder:

```markdown
# Oracle Skills
Installed by: oracle-skills-cli v1.2.3
```

Now the user could ask: "What version do you have?" and the agent would read the file and answer. Success?

No. The user wanted it **immediate**. *"I think we can see when auto complete show here?"*

## Iteration 2: The Injection (v1.2.5)

This was the constraint: We couldn't change OpenCode's source code to add a "Version" column to the autocomplete menu. We only control the *content* of the skills.

So we hacked the content.

We modified the installer to rewrite the `SKILL.md` file on the fly, injecting the version number directly into the `description` field.

**Before:**
```yaml
description: Create session retrospective...
```

**After:**
```yaml
description: v1.2.5 | Create session retrospective...
```

Suddenly, the UI changed. The version was right there in the dropdown. **Data became UI.**

## The Disappearance

We felt like geniuses. We deployed v1.2.5. We restarted the agent.

And then... everything disappeared.

`/rrr`? Gone.
`/trace`? Gone.

The user: *"wth wtf? still no version show?"*

We had fallen into the **Precedence Trap**.

## The Trap: Local Shadows Global

OpenCode (like many tools) has a hierarchy of where it looks for config.
1. **Local Commands** (`.opencode/command/`)
2. **Global Skills** (`~/.config/opencode/skill/`)

We had been testing by installing skills globally (v1.2.5). But we also had some old, unversioned command files sitting in our local project folder.

When we deleted the local folder to "clean up", we thought we were forcing it to use Global. Instead, we triggered a state where OpenCode got confused by the mix of legacy and modern paths.

But the real reveal came when we *restored* the local files. The skills came back... but **without the version**.

Why? Because the **Local (Legacy)** file was taking precedence over the **Global (New)** file. The old file didn't have the version injection. It was shadowing our shiny new feature.

## The Fix: Delete to Upgrade

The solution was counter-intuitive: **Delete the local file to upgrade the feature.**

By removing the local `.opencode/command/rrr.md`, the system fell back to the global `~/.config/opencode/skill/rrr/SKILL.md`.

And there it was: `v1.2.5 | Create session retrospective`.

## Lessons Learned

1. **Data is the UI**: If you can't change the interface, change the data it displays.
2. **Legacy Shadows**: Old configuration files are the most common cause of "it works on my machine" but not yours.
3. **User-Driven Velocity**: We wouldn't have built version injection if the user hadn't kept saying "but showing here?".
4. **Nothing is Deleted**: We moved files to `.tmp` instead of `rm`, which saved us when we needed to debug.

The Oracle is now wiser. The `oracle-skills-cli` is smarter. And we finally know what version we're running.
