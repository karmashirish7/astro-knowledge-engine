import type { AQLCondition, AQLQuery, AQLOperator } from './types'
import { resolveField, mergeFragments } from './fields'

/** Map AQL operator + value → Prisma filter value */
function prismaValue(operator: AQLOperator, value: unknown): unknown {
  switch (operator) {
    case 'eq':       return value
    case 'neq':      return { not: value }
    case 'gt':       return { gt: value }
    case 'gte':      return { gte: value }
    case 'lt':       return { lt: value }
    case 'lte':      return { lte: value }
    case 'in':       return { in: value }
    case 'notIn':    return { notIn: value }
    case 'contains': return { contains: value }
    case 'between': {
      const [min, max] = value as [number, number]
      return { gte: min, lte: max }
    }
    default:         return value
  }
}

/** Convert a single AQLCondition → Prisma PlanetaryData where fragment */
function conditionToFragment(cond: AQLCondition): Record<string, unknown> | null {
  // Try semantic resolver first (handles shorthands like marsInKendra)
  if (cond.operator === 'eq') {
    const resolved = resolveField(cond.field, cond.value)
    if (resolved) return resolved
  }

  // Direct column with operator
  const colMap: Record<string, string> = {
    lagnaNakshatra: 'ascNakshatra', lagnaSign: 'ascSign', lagnaDegree: 'ascDegree',
  }
  const col = colMap[cond.field] ?? cond.field
  return { [col]: prismaValue(cond.operator, cond.value) }
}

/**
 * Translate an AQLQuery → Prisma ChartWhereInput.
 * Result wraps everything inside { planetaryData: { ... } }.
 */
export function aqlToPrisma(query: AQLQuery): Record<string, unknown> {
  if (query.conditions.length === 0) return {}

  const fragments = query.conditions
    .map(conditionToFragment)
    .filter((f): f is Record<string, unknown> => f !== null)

  if (fragments.length === 0) return {}

  if (query.logic === 'OR') {
    return {
      planetaryData: {
        OR: fragments.map(f => f),
      },
    }
  }

  // AND — merge into a single where object
  const merged = fragments.reduce(mergeFragments, {})
  return { planetaryData: merged }
}

/**
 * Convert a conditionsJson string (stored on Dictum) to a Prisma where clause.
 * The JSON is a flat key→value map (semantic shorthands supported).
 */
export function conditionsJsonToPrisma(conditionsJson: string): Record<string, unknown> {
  try {
    const obj = JSON.parse(conditionsJson)
    if (!obj || typeof obj !== 'object' || Object.keys(obj).length === 0) return {}
    const conditions: AQLCondition[] = Object.entries(obj).map(([field, value]) => ({
      field,
      operator: 'eq' as const,
      value,
    }))
    return aqlToPrisma({ conditions, logic: 'AND' })
  } catch {
    return {}
  }
}
