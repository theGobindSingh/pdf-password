export interface WorkerStartMessage {
  type: 'start';
  pdfData: ArrayBuffer;
  charset: string;
  /** Workers only try passwords of at least this length (default 1). */
  minLength: number;
  maxLength: number;
  /** BigInt64Array[0] — workers atomically claim batches of indices from this counter. */
  sharedCounter: SharedArrayBuffer;
  /** How many password indices each worker claims per Atomics.add call. */
  batchSize: number;
  workerId: number;
}

export type WorkerInMessage = WorkerStartMessage;

export interface WorkerProgressMessage {
  type: 'progress';
  attempts: number;
  current: string;
}

export interface WorkerSuccessMessage {
  type: 'success';
  password: string;
  attempts: number;
}

export interface WorkerFailureMessage {
  type: 'failure';
  attempts: number;
}

export interface WorkerErrorMessage {
  type: 'worker-error';
  message: string;
}

export type WorkerOutMessage =
  | WorkerProgressMessage
  | WorkerSuccessMessage
  | WorkerFailureMessage
  | WorkerErrorMessage;
