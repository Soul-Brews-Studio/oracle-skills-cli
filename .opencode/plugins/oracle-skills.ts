/**
 * Oracle Skills Plugin for OpenCode
 * Adds "opencode-cli:" prefix with timestamp (GMT+7) to identify sessions
 */
import type { Plugin } from "@opencode-ai/plugin"

const PREFIX = "opencode-cli:"

/** Get current timestamp in GMT+7 (ICT) format: HH:MM */
function getTimestamp(): string {
  const now = new Date()
  // Convert to GMT+7
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
  const ict = new Date(utc + (7 * 60 * 60 * 1000))
  const hours = ict.getHours().toString().padStart(2, '0')
  const minutes = ict.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

const OracleSkillsPlugin: Plugin = () => ({
  name: "oracle-skills",
  
  "experimental.chat.messages.transform": (_input: any, output: any) => {
    if (output?.messages && Array.isArray(output.messages)) {
      for (const msg of output.messages) {
        const role = msg.info?.role || msg.role
        if (role === "user" && msg.parts && Array.isArray(msg.parts)) {
          for (const part of msg.parts) {
            if (part.type === "text" && part.text && !part.text.startsWith(PREFIX)) {
              const timestamp = getTimestamp()
              part.text = `${PREFIX} [${timestamp} ICT] ${part.text}`
            }
          }
        }
      }
    }
  },
})

export default OracleSkillsPlugin
