/**
 * Iterative password generator that yields every combination
 * of `charset` characters up to `maxLength` characters long.
 *
 * Order: length 1 first, then length 2, etc.
 * Within each length: lexicographic order of charset indices.
 *
 * `firstCharStart` / `firstCharEnd` optionally restrict which charset
 * indices are allowed in the first position, enabling search-space
 * partitioning across multiple workers.
 */
export function* generatePasswords(
  charset: string,
  maxLength: number,
  firstCharStart = 0,
  firstCharEnd = charset.length,
): Generator<string> {
  for (let len = 1; len <= maxLength; len++) {
    const indices = new Array<number>(len).fill(0);
    indices[0] = firstCharStart;

    while (true) {
      yield indices.map((i) => charset[i]).join('');

      // Increment the rightmost index, carry left as needed
      let pos = len - 1;
      while (pos >= 0) {
        indices[pos]++;
        if (indices[pos] < charset.length) break;
        indices[pos] = 0;
        pos--;
      }

      // All combinations for this length/partition exhausted
      if (pos < 0 || indices[0] >= firstCharEnd) break;
    }
  }
}
