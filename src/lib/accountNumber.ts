/**
 * accountNumber.ts
 * ─────────────────────────────────────────────────────────────
 * Generates valid US-style bank account numbers client-side.
 *
 * Structure of a Eccovault account number (10 digits):
 *   [2-digit type prefix] [6-digit random body] [2-digit Luhn check pair]
 *
 * Type prefixes mirror real US bank conventions:
 *   10 = Checking
 *   20 = Savings
 *   30 = Investment
 *   40 = Credit
 *
 * The Luhn algorithm (ISO/IEC 7812) is used by Visa, Mastercard, and most
 * US banks to validate account numbers — a single digit error will always
 * be caught.
 *
 * The DB has a UNIQUE constraint as the authoritative uniqueness guarantee.
 * This module just generates a good candidate to minimise collision retries.
 */

const TYPE_PREFIX: Record<string, string> = {
  checking:   "10",
  savings:    "20",
  investment: "30",
  credit:     "40",
};

// Eccovault's fixed ABA routing number (JP Morgan Chase stand-in)
export const VAULT_ROUTING_NUMBER = "021000021";
export const VAULT_ROUTING_DISPLAY = "0210-0002-1"; // formatted for display

/**
 * Compute the Luhn check digit for a numeric string.
 * Returns the single digit that makes the full number pass Luhn validation.
 */
function luhnCheckDigit(partial: string): number {
  let sum  = 0;
  let flip = true; // the rightmost digit of `partial` is in an "even" position

  for (let i = partial.length - 1; i >= 0; i--) {
    let d = parseInt(partial[i], 10);
    if (flip) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    flip = !flip;
  }

  return (10 - (sum % 10)) % 10;
}

/**
 * Validate a full number string with Luhn.
 */
export function luhnValid(number: string): boolean {
  let sum  = 0;
  let flip = false;

  for (let i = number.length - 1; i >= 0; i--) {
    let d = parseInt(number[i], 10);
    if (flip) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    flip = !flip;
  }

  return sum % 10 === 0;
}

/**
 * Generate a 10-digit US-style account number for the given account type.
 *
 * Format: [2-digit prefix][7-digit random][1-digit Luhn check]
 */
export function generateAccountNumber(accountType: string): string {
  const prefix = TYPE_PREFIX[accountType] ?? "10";

  // 7 random digits
  const body = Array.from({ length: 7 }, () =>
    Math.floor(Math.random() * 10).toString()
  ).join("");

  const partial = prefix + body;                  // 9 digits
  const check   = luhnCheckDigit(partial);        // 1 check digit
  const full    = partial + check.toString();     // 10 digits total

  return full;
}

/**
 * Format a 10-digit account number for display.
 * Shows only the last 4 digits: ****  ****  1234
 */
export function maskAccountNumber(number: string): string {
  if (!number || number.length < 4) return `****${number}`;
  return `•••• •••• ${number.slice(-4)}`;
}

/**
 * Format for display in "Account Details" view (partially revealed).
 * e.g. "10** **** 34" — shows prefix and last 2
 */
export function partialAccountNumber(number: string): string {
  if (!number || number.length < 4) return number;
  const first2 = number.slice(0, 2);
  const last4  = number.slice(-4);
  return `${first2}•• •••• ${last4}`;
}

/**
 * Format routing number for display: 021000021 → 021-000021
 */
export function formatRoutingNumber(routing: string): string {
  if (routing.length === 9) {
    return `${routing.slice(0, 3)}-${routing.slice(3, 5)}-${routing.slice(5)}`;
  }
  return routing;
}

