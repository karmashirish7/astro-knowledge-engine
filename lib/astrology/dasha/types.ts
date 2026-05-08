export interface DashaPeriod {
  planet:        string
  startDate:     Date
  endDate:       Date
  durationYears: number
}

export interface Pratyantardasha extends DashaPeriod {}

export interface Antardasha extends DashaPeriod {
  pratyantardashas: Pratyantardasha[]
}

export interface Mahadasha extends DashaPeriod {
  antardashas: Antardasha[]
}

export type DashaTree = Mahadasha[]

export interface CurrentDasha {
  mahadasha:       DashaPeriod
  antardasha:      DashaPeriod
  pratyantardasha: DashaPeriod
}
