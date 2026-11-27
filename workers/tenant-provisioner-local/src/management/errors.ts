/**
 * Zerocraft Platform - Tenant Provisioner Worker (Local)
 * Structured Management API errors.
 */

export class ManagementApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryable: boolean,
    readonly requestId: string | null = null
  ) {
    super(message);
    this.name = "ManagementApiError";
  }
}

export class ManagementApiTimeoutError extends Error {
  readonly retryable = true;

  constructor(message = "Management API request timed out") {
    super(message);
    this.name = "ManagementApiTimeoutError";
  }
}

export class ManagementApiTransportError extends Error {
  readonly retryable = true;

  constructor(message = "Management API transport failed") {
    super(message);
    this.name = "ManagementApiTransportError";
  }
}

export class ManagementApiResponseError extends Error {
  readonly retryable = false;

  constructor(message: string) {
    super(message);
    this.name = "ManagementApiResponseError";
  }
}

export function isManagementApiError(error: unknown): error is ManagementApiError {
  return error instanceof ManagementApiError;
}

export function isRetryableManagementError(error: unknown): boolean {
  return (
    error instanceof ManagementApiError ||
    error instanceof ManagementApiTimeoutError ||
    error instanceof ManagementApiTransportError
  ) && (error as { retryable?: boolean }).retryable === true;
}
