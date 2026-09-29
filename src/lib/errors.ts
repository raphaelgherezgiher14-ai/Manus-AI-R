export function resolveError(
  error: unknown,
  t: (key: string) => string,
): string {
  const msg = error instanceof Error ? error.message : String(error);
  const known: Record<string, string> = {
    "Invalid login credentials": "auth.signInError",
    "User already registered": "auth.emailInUse",
    "Email not confirmed": "auth.genericError",
    "auth.genericError": "auth.genericError",
    "auth.customerNotFound": "auth.customerNotFound",
  };
  return t(known[msg] ?? "auth.genericError");
}
