import Dexie, { type EntityTable } from 'dexie'

// --- Types ---

export type MetricType = 'weight' | 'reps' | 'time' | 'distance' | 'custom'
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned'
export type SessionType = 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'custom'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  notes?: string
  avatarColor: string
  createdAt: Date
  updatedAt: Date
}

export interface Goal {
  id: string
  clientId: string
  title: string
  metricType: MetricType
  metricUnit: string
  startValue: number
  targetValue: number
  deadline?: Date
  status: GoalStatus
  createdAt: Date
}

export interface GoalCheckIn {
  id: string
  goalId: string
  sessionId?: string
  value: number
  note?: string
  recordedAt: Date
}

export interface Exercise {
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  notes?: string
}

export interface HIITConfig {
  exerciseTime: number
  restTime: number
  rounds: number
  completedRounds: number
}

export interface Session {
  id: string
  clientId: string
  date: Date
  type: SessionType
  notes?: string
  exercises: Exercise[]
  hiitConfig?: HIITConfig
  duration?: number
  createdAt: Date
}

// --- Database ---

const db = new Dexie('FitTrackDB') as Dexie & {
  clients: EntityTable<Client, 'id'>
  goals: EntityTable<Goal, 'id'>
  goalCheckIns: EntityTable<GoalCheckIn, 'id'>
  sessions: EntityTable<Session, 'id'>
}

db.version(1).stores({
  clients: 'id, name, createdAt',
  goals: 'id, clientId, status, createdAt',
  goalCheckIns: 'id, goalId, sessionId, recordedAt',
  sessions: 'id, clientId, date, type, createdAt',
})

export { db }
