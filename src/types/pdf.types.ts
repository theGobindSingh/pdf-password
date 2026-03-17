export type PdfStatus =
  | 'idle'
  | 'checking'
  | 'protected'
  | 'unprotected'
  | 'error';

export interface PdfFile {
  file: File;
  arrayBuffer: ArrayBuffer;
  status: PdfStatus;
  error?: string;
}
