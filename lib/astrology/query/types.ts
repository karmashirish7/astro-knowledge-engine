export type AQLOperator =
  | 'eq' | 'neq'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between'
  | 'in' | 'notIn'
  | 'contains'

export interface AQLCondition {
  field:    string       // e.g. "saturnHouse", "ascNakshatra", "marsInKendra"
  operator: AQLOperator
  value:    unknown      // number | string | [number,number] | string[]
}

export interface AQLQuery {
  conditions: AQLCondition[]
  logic:      'AND' | 'OR'
}

// ── Semantic shorthand types (used in conditionsJson) ─────────────────────────

export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu'
export type HouseGroup = 'kendra' | 'trikona' | 'dusthana' | 'upachaya'
export type DignityValue = 'exalted' | 'debilitated' | 'own' | 'moolatrikona' | 'neutral'
