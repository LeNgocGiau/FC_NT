export type Position = "GK" | "CB" | "LB" | "RB" | "DMF" | "CMF" | "LWF" | "RWF" | "CF"
export type Formation = "4-4-2" | "4-3-3" | "3-5-2" | "5-3-2" | "4-2-3-1" | "3-4-3" | "3-1" | "2-1-1" | "2-2" | "3-2-1" | "3-3" | "2-3-1" | string
export type DrawingMode = "none" | "pencil" | "eraser"
export type InjuryStatus = "fit" | "doubt" | "injured"
export type DisciplineType = "fine" | "suspension" | "warning" | "additional_training"
export type FieldType = "5" | "7" | "11"

export interface Player {
  id: string
  position: Position
  name: string
  color: string
  image: string
  positionKey?: string
  number?: number
  yellowCards?: number
  redCards?: number
  injuryStatus?: InjuryStatus
  isSubstitute?: boolean
}

export interface Team {
  id: string
  name: string
  color: string
  players: Player[]
  substitutions?: Substitution[]
  formation?: Formation
}

export interface Substitution {
  id: string
  playerInId: string
  playerOutId: string
  minute: number
  reason?: string
}

export interface Note {
  id: string
  title: string
  content: string
  createdAt: string
  tags?: string[]
  color?: string
}

export interface Match {
  id: string
  homeTeam: string
  awayTeam: string
  date: string
  time: string
  venue: string
  competition: string
  completed: boolean
  homeScore?: number
  awayScore?: number
  notes?: string
  playerRatings?: {
    homeMVP?: string
    awayMVP?: string
    homeTeamRatings: {
      playerId: string
      score: number
      isMVP?: boolean
    }[]
    awayTeamRatings: {
      playerId: string
      score: number
      isMVP?: boolean
    }[]
  }
}

export interface PlayerDiscipline {
  id: string
  playerId: string
  playerName: string
  position: string
  disciplineType: DisciplineType
  amount?: number
  reason: string
  dateIssued: string
  resolved: boolean
  image?: string
  matches?: number
}
