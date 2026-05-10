import type { Framework } from '@tingly/framework-contract'

/**
 * Replaces i18n-ally's `monopoly: true` with deterministic priority + explicit
 * coexistence consent (fixes 07 P2). Algorithm:
 *   1. Filter to frameworks whose `detection` matched something in the workspace.
 *   2. Reject any framework whose `compatibleWith` excludes one of the others.
 *      If incompatible, the higher-priority one wins; the lower drops out.
 *   3. Returns the surviving set sorted by priority desc, id asc as tiebreaker.
 */
export function resolveActiveFrameworks(
  detected: readonly Framework[]
): readonly Framework[] {
  if (detected.length === 0) return []
  const sorted = [...detected].sort((a, b) =>
    b.priority - a.priority || a.id.localeCompare(b.id)
  )
  const surviving: Framework[] = []
  for (const candidate of sorted) {
    const conflictWith = surviving.find(s =>
      isExclusiveOf(s, candidate) || isExclusiveOf(candidate, s)
    )
    if (conflictWith) continue
    surviving.push(candidate)
  }
  return surviving
}

function isExclusiveOf(a: Framework, b: Framework): boolean {
  return a.compatibleWith !== undefined && !a.compatibleWith.includes(b.id)
}
