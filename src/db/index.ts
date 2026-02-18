import Dexie, { type EntityTable } from 'dexie'

// --- Types ---

export type MetricType = 'weight' | 'reps' | 'time' | 'distance' | 'custom'
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned'
export type SessionType = 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'custom'
export type SessionStatus = 'planned' | 'in_progress' | 'completed'

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

export interface SessionExercise {
  name: string
  targetReps?: number
  targetWeight?: number
  targetDuration?: number
  actualReps?: number
  actualWeight?: number
  actualDuration?: number
  completed: boolean
  notes?: string
}

export interface SessionSet {
  exercises: SessionExercise[]
  completed: boolean
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
  sets: SessionSet[]
  hiitConfig?: HIITConfig
  status: SessionStatus
  startedAt?: Date
  completedAt?: Date
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

db.version(2)
  .stores({
    sessions: 'id, clientId, date, type, status, createdAt',
  })
  .upgrade((tx) =>
    tx
      .table('sessions')
      .toCollection()
      .modify((session: Record<string, unknown>) => {
        const oldExercises = (session.exercises as Array<Record<string, unknown>>) ?? []
        session.sets = [
          {
            exercises: oldExercises.map((ex) => ({
              name: ex.name,
              targetReps: ex.reps,
              targetWeight: ex.weight,
              targetDuration: ex.duration,
              actualReps: ex.reps,
              actualWeight: ex.weight,
              actualDuration: ex.duration,
              completed: true,
              notes: ex.notes,
            })),
            completed: true,
          },
        ]
        session.status = 'completed'
        delete session.exercises
      }),
  )

export { db }
