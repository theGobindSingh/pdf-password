/**
 * Checks whether a PDF ArrayBuffer is password-protected.
 *
 * Strategy:
 * - Load the PDF with pdf-lib using no password.
 * - If it loads successfully → unprotected.
 * - If it throws with an encryption/password-related message → protected.
 * - Any other error is re-thrown.
 */
export const checkPdfProtection = async (
  arrayBuffer: ArrayBuffer,
): Promise<'protected' | 'unprotected'> => {
  const { PDFDocument } = await import('pdf-lib');

  try {
    await PDFDocument.load(arrayBuffer, { ignoreEncryption: false });
    return 'unprotected';
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err).toLowerCase();
    if (
      message.includes('encrypt') ||
      message.includes('password') ||
      message.includes('decrypt') ||
      message.includes('protected')
    ) {
      return 'protected';
    }
    throw err;
  }
};
