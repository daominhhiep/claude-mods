export type CockpitTab = 'weather' | 'agents' | 'sessions' | 'blast' | 'replay' | 'log' | 'theme' | 'config' | 'pet' | 'skins' | 'trophies'

export type PetLifeStage = 'egg' | 'baby' | 'kid' | 'adult' | 'elder'

/** The pet kept across sessions: its name, and the turns of each day it was looked after. */
export type PetLife = {
  name: string
  bornAt: number
  /** Local calendar day, YYYY-MM-DD, to the turns that day. */
  days: Record<string, number>
  lastFedAt: number | null
  turns: number
  /** The skin it wears, one of PET_SKINS. */
  skin: string
  /** Achievement id to when it was earned. */
  achievements: Record<string, number>
  /** Times it has been petted, and when last. */
  pats: number
  lastPattedAt: number | null
  /** Local calendar day to the pats that day, the last few weeks only. */
  patDays: Record<string, number>
  /** What hatched from the egg, one of PET_SPECIES; null while an egg. */
  species: string | null
  /** The way it grew up, one of PET_PATHS; null until grown up. */
  path: string | null
  /** Turns finished in each local hour of the day, 0 to 23. */
  hours: number[]
  /** Turns since the current egg was laid; it hatches at PET_HATCH_TURNS. */
  eggTurns: number
  /** When a new egg last replaced the pet, or null if never. */
  eggAt: number | null
}

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
        pet: boolean
      }
      petLife: PetLife
      burst: { at: number; text: string } | null
      flash: { at: number; percent: number } | null
    }
  }
}
