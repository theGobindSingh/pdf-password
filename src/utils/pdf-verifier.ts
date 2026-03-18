import { logger } from './logger';

/**
 * Minimal PDF Standard Security Handler password verifier.
 * Supports Revision 2 / 3 / 4 (RC4-based) and Revision 5 / 6 (AES-256 via SubtleCrypto).
 * Parses only the /Encrypt dictionary from raw PDF bytes — no full PDF rendering needed.
 */

// PDF password-padding string (ISO 32000-1 §7.6.3.3 Table 62)
const PADDING = new Uint8Array([
  0x28, 0xbf, 0x4e, 0x5e, 0x4e, 0x75, 0x8a, 0x41, 0x64, 0x00, 0x4e, 0x56, 0xff,
  0xfa, 0x01, 0x08, 0x2e, 0x2e, 0x00, 0xb6, 0xd0, 0x68, 0x3e, 0x80, 0x2f, 0x0c,
  0xa9, 0xfe, 0x64, 0x53, 0x69, 0x7a,
]);

// ─── MD5 (RFC 1321) ──────────────────────────────────────────────────────────
// Precomputed T[i] = floor(2^32 * |sin(i+1)|) for i in 0..63
const MD5_T = new Uint32Array([
  0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
  0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
  0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
  0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
  0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
  0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
  0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
  0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
  0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
  0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
  0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
]);
// Per-round shift amounts [R1 ×16, R2 ×16, R3 ×16, R4 ×16]
const MD5_S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const md5 = (data: Uint8Array): Uint8Array => {
  const msgLen = data.length;
  const zCount = (55 - (msgLen % 64) + 64) % 64;
  const buf = new Uint8Array(msgLen + 1 + zCount + 8);
  buf.set(data);
  buf[msgLen] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = msgLen * 8;
  dv.setUint32(buf.length - 8, bits >>> 0, true);
  dv.setUint32(buf.length - 4, Math.floor(bits / 2 ** 32), true);

  let a = 0x67452301,
    b = 0xefcdab89,
    c = 0x98badcfe,
    d = 0x10325476;
  for (let blk = 0; blk < buf.length; blk += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = dv.getUint32(blk + j * 4, true);
    const [aa, bb, cc, dd] = [a, b, c, d];
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) % 16;
      }
      const s = MD5_S[j];
      const sum = (a + f + M[g] + MD5_T[j]) >>> 0;
      [a, b, c, d] = [d, (b + ((sum << s) | (sum >>> (32 - s)))) >>> 0, b, c];
    }
    a = (a + aa) >>> 0;
    b = (b + bb) >>> 0;
    c = (c + cc) >>> 0;
    d = (d + dd) >>> 0;
  }

  const out = new Uint8Array(16);
  const r = new DataView(out.buffer);
  r.setUint32(0, a, true);
  r.setUint32(4, b, true);
  r.setUint32(8, c, true);
  r.setUint32(12, d, true);
  return out;
};

// ─── RC4 stream cipher ───────────────────────────────────────────────────────
const rc4 = (key: Uint8Array, data: Uint8Array): Uint8Array => {
  const K = new Uint8Array(256);
  for (let i = 0; i < 256; i++) K[i] = i;
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + K[i] + key[i % key.length]) & 0xff;
    [K[i], K[j]] = [K[j], K[i]];
  }
  const out = new Uint8Array(data.length);
  let x = 0,
    y = 0;
  for (let k = 0; k < data.length; k++) {
    x = (x + 1) & 0xff;
    y = (y + K[x]) & 0xff;
    [K[x], K[y]] = [K[y], K[x]];
    out[k] = data[k] ^ K[(K[x] + K[y]) & 0xff];
  }
  return out;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const hexToBytes = (hex: string): Uint8Array => {
  const h = hex.replace(/\s/g, '');
  const out = new Uint8Array(h.length >>> 1);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
};

/**
 * Parses a PDF literal string `(...)` starting at `str[offset]`.
 * Handles backslash escapes and nested balanced parentheses.
 * The string must have been decoded with iso-8859-1 so charCodeAt gives the raw byte value.
 */
const parseLiteralString = (
  str: string,
  offset: number,
): { bytes: Uint8Array; end: number } | null => {
  if (str[offset] !== '(') return null;
  const bytes: number[] = [];
  let i = offset + 1;
  let depth = 1;
  while (i < str.length && depth > 0) {
    const ch = str[i];
    if (ch === '\\') {
      i++;
      const esc = str[i];
      if (esc >= '0' && esc <= '7') {
        // Octal escape \ddd
        let oct = esc;
        if (
          str[i + 1] !== undefined &&
          str[i + 1] >= '0' &&
          str[i + 1] <= '7'
        ) {
          oct += str[++i];
          if (
            str[i + 1] !== undefined &&
            str[i + 1] >= '0' &&
            str[i + 1] <= '7'
          )
            oct += str[++i];
        }
        bytes.push(parseInt(oct, 8) & 0xff);
      } else if (esc === '\r') {
        // Line continuation: skip \r and optional following \n
        if (str[i + 1] === '\n') i++;
      } else if (esc === '\n') {
        // Line continuation: ignore
      } else {
        const escMap: Record<string, number> = {
          n: 0x0a,
          r: 0x0d,
          t: 0x09,
          b: 0x08,
          f: 0x0c,
          '(': 0x28,
          ')': 0x29,
          '\\': 0x5c,
        };
        bytes.push(escMap[esc] ?? str.charCodeAt(i) & 0xff);
      }
    } else if (ch === '(') {
      depth++;
      bytes.push(0x28);
    } else if (ch === ')') {
      depth--;
      if (depth > 0) bytes.push(0x29);
    } else {
      bytes.push(str.charCodeAt(i) & 0xff);
    }
    i++;
  }
  if (depth !== 0) return null;
  return { bytes: new Uint8Array(bytes), end: i };
};

/**
 * Extracts the byte value of a PDF string field (key like `O`, `U`, `ID`).
 * Handles both hex `<hex>` and literal `(...)` string formats.
 */
const extractByteField = (flat: string, key: string): Uint8Array | null => {
  // Hex format: /KEY <hexdigits>
  const hexM = new RegExp(`\\/${key}\\s*<([0-9a-fA-F\\s]+)>`).exec(flat);
  if (hexM) return hexToBytes(hexM[1]);

  // Literal string format: /KEY (...)
  const litM = new RegExp(`\\/${key}\\s*(\\()`).exec(flat);
  if (litM) {
    // Position of the `(` character
    const parenPos = litM.index + litM[0].length - 1;
    const result = parseLiteralString(flat, parenPos);
    if (result) return result.bytes;
  }
  return null;
};

const concat = (...parts: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};

const eq = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

// ─── PDF /Encrypt dict parser ─────────────────────────────────────────────────

export interface EncryptDict {
  r: number; // security handler revision
  o: Uint8Array; // /O (32 bytes for R2-4, 48 for R5-6)
  u: Uint8Array; // /U (32 bytes for R2-4, 48 for R5-6)
  p: number; // /P permissions (signed 32-bit)
  keyLen: number; // encryption key length in bytes
  id0: Uint8Array; // first element of /ID array
  encryptMeta: boolean;
}

/** Strips nested << ... >> blocks, keeping only the top-level content. */
const flattenDict = (content: string): string => {
  let out = '',
    depth = 0,
    i = 0;
  while (i < content.length - 1) {
    if (content[i] === '<' && content[i + 1] === '<') {
      depth++;
      i += 2;
    } else if (content[i] === '>' && content[i + 1] === '>') {
      depth--;
      i += 2;
    } else {
      if (depth === 0) out += content[i];
      i++;
    }
  }
  if (depth === 0 && i < content.length) out += content[i];
  return out;
};

/** Extracts content between the outermost << >> starting at `from`. */
const extractDictContent = (text: string, from: number): string | null => {
  const start = text.indexOf('<<', from);
  if (start < 0) return null;
  let depth = 0,
    i = start;
  while (i < text.length - 1) {
    if (text[i] === '<' && text[i + 1] === '<') {
      depth++;
      i += 2;
    } else if (text[i] === '>' && text[i + 1] === '>') {
      depth--;
      i += 2;
      if (depth === 0) return text.slice(start + 2, i - 2);
    } else i++;
  }
  return null;
};

export const parsePdfEncrypt = (pdfBytes: Uint8Array): EncryptDict | null => {
  // iso-8859-1 maps each byte 0x00-0xFF to its Unicode equivalent, so the ASCII
  // structure is preserved and binary segments are safe to regex over.
  const text = new TextDecoder('iso-8859-1').decode(pdfBytes);

  // /Encrypt appears in the trailer dict or cross-reference stream dict
  const encRef = /\/Encrypt\s+(\d+)\s+(\d+)\s+R/.exec(text);
  if (!encRef) {
    logger.warn('[parsePdfEncrypt] no /Encrypt indirect reference found');
    return null;
  }
  const [, num, gen] = encRef;

  const objM = new RegExp(`\\b${num}\\s+${gen}\\s+obj`).exec(text);
  if (!objM) {
    logger.warn(`[parsePdfEncrypt] object ${num} ${gen} obj not found in file`);
    return null;
  }

  const rawContent = extractDictContent(text, objM.index + objM[0].length);
  if (!rawContent) {
    logger.warn(
      '[parsePdfEncrypt] could not extract dict content from encrypt object',
    );
    return null;
  }

  // Flatten so nested /CF sub-dicts don't interfere with field matching
  const flat = flattenDict(rawContent);
  logger.debug('[parsePdfEncrypt] flat encrypt dict:', flat.slice(0, 300));

  const r = Number((/\/R\s+(\d+)/.exec(flat) ?? [])[1]);
  if (!r) {
    logger.warn(
      '[parsePdfEncrypt] /R not found or zero in encrypt dict. flat:',
      flat.slice(0, 300),
    );
    return null;
  }

  const pMatch = /\/P\s+(-?\d+)/.exec(flat);
  const p = parseInt(pMatch?.[1] ?? '0', 10);
  const keyLenBits =
    Number((/\/KeyLength\s+(\d+)/.exec(flat) ?? [])[1]) || (r === 2 ? 40 : 128);
  const keyLen = r === 2 ? 5 : keyLenBits / 8;
  const encryptMeta =
    !/\/EncryptMetadata\s*\(false\)|\/EncryptMetadata\s+false/.test(flat);

  const o = extractByteField(flat, 'O');
  const u = extractByteField(flat, 'U');
  if (!o || !u) {
    logger.warn(
      '[parsePdfEncrypt] /O or /U strings not found (tried hex and literal formats)',
    );
    logger.warn('[parsePdfEncrypt] flat dict snippet:', flat.slice(0, 500));
    return null;
  }

  if (o.length < 32 || u.length < 32) return null;

  // /ID is in the trailer or xref-stream dict, not the Encrypt object.
  // Try hex format first, then literal string format.
  let id0: Uint8Array | null = null;
  const idHexM = /\/ID\s*\[<([0-9a-fA-F\s]*)>/.exec(text);
  if (idHexM) {
    id0 = hexToBytes(idHexM[1]);
  } else {
    const idLitM = /\/ID\s*\[\s*(\()/.exec(text);
    if (idLitM) {
      const parenPos = idLitM.index + idLitM[0].length - 1;
      const result = parseLiteralString(text, parenPos);
      if (result) id0 = result.bytes;
    }
  }
  if (!id0) {
    logger.warn('[parsePdfEncrypt] /ID array not found in trailer');
    return null;
  }

  const need = r >= 5 ? 48 : 32;
  return {
    r,
    o: o.slice(0, need),
    u: u.slice(0, need),
    p,
    keyLen,
    id0,
    encryptMeta,
  };
};

// ─── Encryption key derivation (Algorithm 2, ISO 32000-1 §7.6.3.3) ──────────
const computeKey = (password: string, dict: EncryptDict): Uint8Array => {
  const pwBytes = new TextEncoder().encode(password);
  const padded = new Uint8Array(32);
  const take = Math.min(pwBytes.length, 32);
  padded.set(pwBytes.slice(0, take));
  if (take < 32) padded.set(PADDING.slice(0, 32 - take), take);

  const pBuf = new Uint8Array(4);
  new DataView(pBuf.buffer).setInt32(0, dict.p, true);

  const parts: Uint8Array[] = [padded, dict.o.slice(0, 32), pBuf, dict.id0];
  if (dict.r >= 4 && !dict.encryptMeta)
    parts.push(new Uint8Array([0xff, 0xff, 0xff, 0xff]));

  let hash = md5(concat(...parts));
  if (dict.r >= 3) {
    for (let i = 0; i < 50; i++) hash = md5(hash.slice(0, dict.keyLen));
  }
  return hash.slice(0, dict.keyLen);
};

// ─── Synchronous verifier (R2 / R3 / R4) ─────────────────────────────────────
export const verifyPassword = (
  dict: EncryptDict,
  password: string,
): boolean => {
  const key = computeKey(password, dict);
  if (dict.r === 2) {
    // Algorithm 4: RC4(key, padding) must equal U
    return eq(rc4(key, PADDING), dict.u);
  }
  // Algorithm 5 (R3/R4): RC4 cascade over 20 passes; compare first 16 bytes
  const hash = md5(concat(PADDING, dict.id0));
  let result = rc4(key, hash);
  for (let i = 1; i <= 19; i++) {
    result = rc4(
      key.map((b) => b ^ i),
      result,
    );
  }
  return eq(result, dict.u.slice(0, 16));
};

// ─── Async verifier (R5 / R6, AES-256 via SubtleCrypto) ──────────────────────
export const verifyPasswordAsync = async (
  dict: EncryptDict,
  password: string,
): Promise<boolean> => {
  // User validation: SHA-256(password[0..32] + U_validation_salt) == U_hash
  const pwBytes = new TextEncoder().encode(password).slice(0, 32);
  const salt = dict.u.slice(32, 40);
  const hashBuf = await crypto.subtle.digest('SHA-256', concat(pwBytes, salt));
  return eq(new Uint8Array(hashBuf), dict.u.slice(0, 32));
};

// ─── Convenience wrapper ──────────────────────────────────────────────────────
export const verifyPdfPassword = async (
  pdfBytes: Uint8Array,
  password: string,
): Promise<boolean | null> => {
  const dict = parsePdfEncrypt(pdfBytes);
  if (!dict) return null;
  if (dict.r >= 5) return verifyPasswordAsync(dict, password);
  return verifyPassword(dict, password);
};
