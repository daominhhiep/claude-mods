export type CockpitTab = 'weather' | 'agents' | 'blast' | 'replay' | 'log'

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
    }
  }
}
