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
export const passwordSpaceSize = (
  charset: string,
  maxLength: number,
): bigint => {
  let total = 0n;
  let power = 1n;
  const base = BigInt(charset.length);
  for (let len = 1; len <= maxLength; len++) {
    power *= base;
    total += power;
  }
  return total;
};

/**
 * Converts a password candidate back into its flat search-space index.
 * Returns null when the candidate contains characters outside the charset.
 */
export const passwordIndex = (
  charset: string,
  password: string,
): bigint | null => {
  if (password.length === 0) {
    return null;
  }

  const base = BigInt(charset.length);
  const indices = new Map<string, bigint>();
  for (let i = 0; i < charset.length; i++) {
    indices.set(charset[i], BigInt(i));
  }

  let offset = 0n;
  let blockSize = 1n;
  for (let len = 1; len < password.length; len++) {
    blockSize *= base;
    offset += blockSize;
  }

  let value = 0n;
  for (const char of password) {
    const digit = indices.get(char);
    if (digit === undefined) {
      return null;
    }
    value = value * base + digit;
  }

  return offset + value;
};

/**
 * Converts a flat integer index into the corresponding password candidate.
 *
 * Index 0 → first 1-char candidate, … , charset.length-1 → last 1-char candidate,
 * charset.length → first 2-char candidate, and so on.
 */
export const nthPassword = (
  charset: string,
  maxLength: number,
  n: number,
): string => {
  const base = charset.length;
  let offset = n;
  for (let len = 1; len <= maxLength; len++) {
    const count = base ** len;
    if (offset < count) {
      const chars: string[] = new Array(len);
      for (let i = len - 1; i >= 0; i--) {
        chars[i] = charset[offset % base]!;
        offset = Math.floor(offset / base);
      }
      return chars.join('');
    }
    offset -= count;
  }
  return '';
};
