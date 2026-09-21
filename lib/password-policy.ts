/**
 * Rules for choosing an admin password. Pure, so the server action and the tests share one definition.
 *
 * Length beats cleverness: a long password is hard to guess whatever it contains, so the rules are a
 * generous minimum, bcrypt's real ceiling, and a refusal of the few things that are obviously bad.
 */
export const MIN_PASSWORD_LENGTH = 10;
/** bcrypt only reads the first 72 bytes; anything after that would be silently ignored. */
export const MAX_PASSWORD_BYTES = 72;

/** Passwords that ship with, or have been written into, this project. Never acceptable. */
export const KNOWN_DEFAULT_PASSWORDS = ["STBS@admin123"];

export const isKnownDefaultPassword = (password: string) =>
  KNOWN_DEFAULT_PASSWORDS.some((d) => d.toLowerCase() === password.toLowerCase());

export type PasswordInput = { current: string; next: string; confirm: string; email?: string | null };

/**
 * What is wrong with a *new* password, or null when it is fine. Used on its own when there is no current
 * password to compare against (resetting from an emailed link) and by `passwordProblem` when there is.
 */
export function newPasswordProblem({ next, confirm, email, current }: { next: string; confirm: string; email?: string | null; current?: string }): string | null {
  if (!next) return "Enter a new password.";
  if (next !== confirm) return "The two new passwords do not match.";
  if (next.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (new TextEncoder().encode(next).length > MAX_PASSWORD_BYTES) return `That is too long. Use at most ${MAX_PASSWORD_BYTES} bytes (about ${MAX_PASSWORD_BYTES} plain characters).`;
  if (current !== undefined && next === current) return "The new password must be different from the current one.";
  if (isKnownDefaultPassword(next)) return "That is the default password that ships with this site. Choose your own.";
  if (new Set(next).size < 5) return "That is too repetitive. Mix in more different characters.";
  const local = (email ?? "").split("@")[0].toLowerCase();
  if (local.length >= 4 && next.toLowerCase().includes(local)) return "Do not use your email or username inside the password.";
  return null;
}

/** Returns what is wrong with a change-password request, in words a person can act on, or null when it is fine. */
export function passwordProblem({ current, next, confirm, email }: PasswordInput): string | null {
  if (!current) return "Enter your current password.";
  return newPasswordProblem({ next, confirm, email, current });
}
