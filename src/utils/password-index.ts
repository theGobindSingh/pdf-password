/**
 * Index-based password space navigation.
 *
 * The password space is ordered by length first (length 1, then 2, …, then maxLength),
 * and within each length by lexicographic order of charset indices (odometer-style).
 * This matches the enumeration order of generatePasswords().
 */

/**
 * Total number of candidates for a given charset and maxLength.
 * Returns a bigint to avoid precision loss for large search spaces.
 */
export function passwordSpaceSize(charset: string, maxLength: number): bigint {
  let total = 0n
  let power = 1n
  const base = BigInt(charset.length)
  for (let len = 1; len <= maxLength; len++) {
    power *= base
    total += power
  }
  return total
}

/**
 * Converts a flat integer index into the corresponding password candidate.
 *
 * Index 0 → first 1-char candidate, … , charset.length-1 → last 1-char candidate,
 * charset.length → first 2-char candidate, and so on.
 */
export function nthPassword(charset: string, maxLength: number, n: number): string {
  const base = charset.length
  let offset = n
  for (let len = 1; len <= maxLength; len++) {
    const count = base ** len
    if (offset < count) {
      const chars: string[] = new Array(len)
      for (let i = len - 1; i >= 0; i--) {
        chars[i] = charset[offset % base]!
        offset = Math.floor(offset / base)
      }
      return chars.join('')
    }
    offset -= count
  }
  return ''
}
