const ROMAN: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

/**
 * A number the way a folio numbers its plates and a ladder its rungs: the pick screen's plate
 * numbers and the HUD's rung. Nothing (an empty string) for zero or less.
 */
export function roman(n: number): string {
  let out = '';
  for (const [v, r] of ROMAN) while (n >= v) { out += r; n -= v; }
  return out;
}
