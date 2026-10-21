export type CockpitTab = 'weather' | 'agents' | 'sessions' | 'blast' | 'replay' | 'log' | 'theme' | 'config'

export type PinnedSession = {
  id: string
  name: string | null
  title: string
  cwd: string
  pinnedAt: number
  lastActive: number
  usd: number | null
}

export type AgentCost = {
  id: string
  label: string
  durationMs: number
  inputTokens: number
  outputTokens: number
}

export type PromptCost = {
  id: string
  text: string
  startedAt: number
  durationMs: number | null
  usdAtStart: number | null
  usd: number | null
  inputTokens: number
  outputTokens: number
  model: string
  agents: AgentCost[]
}

export type WeatherReading = {
  at: number
  percent: number
  tokens: number
  window: number
  compactAt: number | null
  usd: number | null
}

export type BlastOutcome = 'waiting' | 'ran' | 'failed' | 'refused'

export type BlastRecord = {
  id: string
  at: number
  command: string
  kind: string
  preview: string[]
  outcome: BlastOutcome
}

export type DiffStep = {
  id: string
  at: number
  tool: string
  path: string
  diff: string
  isCut: boolean
  added: number
  removed: number
}

export type CallStatus = 'running' | 'ok' | 'error' | 'refused'

export type CallRecord = {
  id: string
  tool: string
  summary: string
  startedAt: number
  ms: number | null
  status: CallStatus
}

export type PrStatus = {
  at: number
  branch: string
  number: number | null
  title: string
  url: string
  state: string
  review: string
  passed: number
  failed: number
  pending: number
  failing: string[]
  problem: string | null
}

export type AgentNode = {
  id: string
  parentId: string | null
  label: string
  description: string
  status: string
  startedAt: number
  endedAt: number | null
  tool: string | null
  tools: number
  uncached: number
  cacheRead: number
  cacheWrite: number
  output: number
}

declare module 'claude-code' {
  interface PluginState {
    'session-cockpit': {
      tab: CockpitTab
      weather: WeatherReading[]
      blasts: BlastRecord[]
      steps: DiffStep[]
      step: number
      calls: CallRecord[]
      costs: PromptCost[]
      tick: number
      cacheAt: number | null
      budget: number | null
      budgetWarned: boolean
      pr: PrStatus | null
      prRef: string | null
      agents: AgentNode[]
      modelInfo: { model: string; effort: string | null } | null
      compactAt: number | null
      compactWindow: { tokens: number; source: string } | null
      pins: PinnedSession[]
      pinScope: 'project' | 'all'
      sessionId: string | null
      keepDays: number
      frame: number
      paneFrame: number
      theme: string
      effects: {
        fireworks: boolean
        flash: boolean
        wave: boolean
        breathe: boolean
        typing: boolean
        ring: boolean
      }
      burst: { at: number; text: string } | null
      flash: { at: number; percent: number } | null
    }
  }
}
