export {
  safeRedirectPath,
  isSafeOrigin,
  originOf,
  absoluteUrlPathOnAllowedOrigin,
  resolvePostAuthDestination,
  buildCallbackUrl,
} from "./redirects";
export type { PostAuthDestination, OriginConfig } from "./redirects";

export {
  generateRandomToken,
  createPkceVerifier,
  createPkcePair,
  createCodeChallenge,
  sha256Base64Url,
  sha256Hex,
  timingSafeEqualBase64Url,
  signHandoffRequest,
  verifyHandoffRequest,
  base64UrlToBytes,
  isValidHandoffCode,
  isValidPkceVerifier,
  isValidCodeChallenge,
  isValidState,
  HANDOFF_CODE_BYTES,
  HANDOFF_CODE_TTL_SECONDS,
  HANDOFF_TIMESTAMP_WINDOW_MS,
} from "./crypto";
export type { HandoffSignatureInput, HandoffRequestBody } from "./crypto";

export {
  normalizeEmail,
  authErrorMessage,
  classifySupabaseAuthError,
} from "./email";
export type {
  EmailValidationResult,
  AuthFailureCode,
} from "./email";

export {
  createRateLimiter,
  authRateLimiter,
  RATE_LIMIT_RULES,
} from "./rate-limit";
export type {
  RateLimitRule,
  RateLimitResult,
  RateLimiter,
} from "./rate-limit";
