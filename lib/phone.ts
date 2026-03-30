export type PhoneCountry = {
  id: string;
  dial: string;
  label: string;
  /** 10-digit NANP local number (US/CA) */
  nanp: boolean;
};

/** Starter list; US first as default. Same dial +1 appears twice (US, CA). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { id: "US", dial: "+1", label: "United States (+1)", nanp: true },
  { id: "CA", dial: "+1", label: "Canada (+1)", nanp: true },
  { id: "GB", dial: "+44", label: "United Kingdom (+44)", nanp: false },
  { id: "AU", dial: "+61", label: "Australia (+61)", nanp: false },
  { id: "DE", dial: "+49", label: "Germany (+49)", nanp: false },
  { id: "FR", dial: "+33", label: "France (+33)", nanp: false },
  { id: "IE", dial: "+353", label: "Ireland (+353)", nanp: false },
  { id: "IT", dial: "+39", label: "Italy (+39)", nanp: false },
  { id: "ES", dial: "+34", label: "Spain (+34)", nanp: false },
  { id: "NL", dial: "+31", label: "Netherlands (+31)", nanp: false },
  { id: "JP", dial: "+81", label: "Japan (+81)", nanp: false },
  { id: "KR", dial: "+82", label: "South Korea (+82)", nanp: false },
  { id: "IN", dial: "+91", label: "India (+91)", nanp: false },
  { id: "CN", dial: "+86", label: "China (+86)", nanp: false },
  { id: "MX", dial: "+52", label: "Mexico (+52)", nanp: false },
  { id: "BR", dial: "+55", label: "Brazil (+55)", nanp: false },
  { id: "AR", dial: "+54", label: "Argentina (+54)", nanp: false },
  { id: "NZ", dial: "+64", label: "New Zealand (+64)", nanp: false },
  { id: "SG", dial: "+65", label: "Singapore (+65)", nanp: false },
  { id: "AE", dial: "+971", label: "United Arab Emirates (+971)", nanp: false },
];

const DIAL_SORTED = [...PHONE_COUNTRIES].sort(
  (a, b) => b.dial.length - a.dial.length
);

export const DEFAULT_PHONE_COUNTRY_ID = "US";

export function getPhoneCountry(id: string): PhoneCountry | undefined {
  return PHONE_COUNTRIES.find((c) => c.id === id);
}

/** Visible US/CA formatting: (555) 123-4567 */
export function formatUsNationalDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  if (d.length === 0) return "";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

/**
 * Parse stored `profiles.phone` into UI state.
 * Prefers E.164; tolerates legacy 10-digit US and 11-digit 1… US.
 */
export function parsePhoneFromStored(stored: string | null): {
  countryId: string;
  nationalDigits: string;
} {
  if (!stored?.trim()) {
    return { countryId: DEFAULT_PHONE_COUNTRY_ID, nationalDigits: "" };
  }
  const t = stored.trim();
  if (t.startsWith("+")) {
    const rest = t.slice(1).replace(/\D/g, "");
    for (const c of DIAL_SORTED) {
      const dialNum = c.dial.slice(1);
      if (rest.startsWith(dialNum)) {
        let national = rest.slice(dialNum.length);
        if (c.nanp && national.length === 11 && national.startsWith("1")) {
          national = national.slice(1);
        }
        return { countryId: c.id, nationalDigits: national };
      }
    }
    if (rest.length === 11 && rest.startsWith("1")) {
      return { countryId: "US", nationalDigits: rest.slice(1) };
    }
    return { countryId: DEFAULT_PHONE_COUNTRY_ID, nationalDigits: rest };
  }
  const digitsOnly = t.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return { countryId: "US", nationalDigits: digitsOnly };
  }
  if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    return { countryId: "US", nationalDigits: digitsOnly.slice(1) };
  }
  return { countryId: DEFAULT_PHONE_COUNTRY_ID, nationalDigits: digitsOnly };
}

export function normalizePhoneE164(
  countryId: string,
  nationalDigits: string
):
  | { ok: true; e164: string | null }
  | { ok: false; message: string } {
  const digits = nationalDigits.replace(/\D/g, "");
  if (!digits) {
    return { ok: true, e164: null };
  }
  const c = getPhoneCountry(countryId);
  if (!c) {
    return { ok: false, message: "Select a valid country." };
  }
  if (c.nanp) {
    if (digits.length !== 10) {
      return {
        ok: false,
        message: "Enter a valid 10-digit phone number.",
      };
    }
    return { ok: true, e164: `${c.dial}${digits}` };
  }
  if (digits.length < 5 || digits.length > 15) {
    return {
      ok: false,
      message: "Enter 5–15 digits for your phone number.",
    };
  }
  return { ok: true, e164: `${c.dial}${digits}` };
}

/** E.164 storage: + then 1–15 digits (ITU-T). Null is allowed (cleared phone). */
export function isValidE164ForStorage(value: string | null): boolean {
  if (value === null) return true;
  const t = value.trim();
  if (!t) return false;
  return /^\+[1-9]\d{1,14}$/.test(t);
}
