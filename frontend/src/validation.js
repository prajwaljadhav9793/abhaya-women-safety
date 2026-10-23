export const EMAIL_PATTERN =
  "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[cC][oO][mM]";
export const MOBILE_PATTERN = "[0-9]{10}";

const EMAIL_RE = new RegExp(`^(?:${EMAIL_PATTERN})$`);
const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "live.com",
  "protonmail.com"
];

function isWithinOneDomainTypo(value, expected) {
  if (Math.abs(value.length - expected.length) > 1) return false;

  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < value.length && j < expected.length) {
    if (value[i] === expected[j]) {
      i += 1;
      j += 1;
      continue;
    }

    edits += 1;
    if (edits > 1) return false;
    if (
      i + 1 < value.length &&
      j + 1 < expected.length &&
      value[i] === expected[j + 1] &&
      value[i + 1] === expected[j]
    ) {
      i += 2;
      j += 2;
    } else if (value.length === expected.length) {
      i += 1;
      j += 1;
    } else if (value.length > expected.length) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return edits + (value.length - i) + (expected.length - j) <= 1;
}

export function isValidEmail(value) {
  if (typeof value !== "string" || !EMAIL_RE.test(value.trim())) return false;
  const domain = value.trim().split("@").at(-1).toLowerCase();
  if (
    domain.endsWith(".com.com") ||
    COMMON_EMAIL_DOMAINS.some(
      (knownDomain) => domain !== knownDomain && domain.includes(knownDomain.slice(0, -4))
    )
  ) return false;
  return !COMMON_EMAIL_DOMAINS.some(
    (knownDomain) =>
      domain !== knownDomain && isWithinOneDomainTypo(domain, knownDomain)
  );
}

export function normalizeEmail(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

export function isValidMobileNumber(value) {
  return typeof value === "string" && /^[0-9]{10}$/.test(value.trim());
}
