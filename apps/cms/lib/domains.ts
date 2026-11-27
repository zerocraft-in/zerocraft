/** Only relative same-origin return paths are accepted after authentication. */
export function isSafeReturnPath(value: string | null | undefined, fallback = "/store") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f\x7f]/.test(value)) return fallback;
  return value;
}
