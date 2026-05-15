export interface Caregiver {
  id: string;
  name: string;
  role: string;
}

export const FIXED_CAREGIVERS: Caregiver[] = [
  { id: "caregiver-mom", name: "김대교", role: "엄마" },
  { id: "caregiver-dad", name: "이해커톤", role: "아빠" },
];

export const DEFAULT_ACTIVE_CAREGIVER_ID = "caregiver-mom";

const CAREGIVERS_KEY = "caregivers";
const ACTIVE_KEY = "active-caregiver-id";

export function ensureFixedCaregivers(): void {
  try {
    localStorage.setItem(CAREGIVERS_KEY, JSON.stringify(FIXED_CAREGIVERS));
    if (!localStorage.getItem(ACTIVE_KEY)) {
      localStorage.setItem(ACTIVE_KEY, DEFAULT_ACTIVE_CAREGIVER_ID);
    }
  } catch {}
}

export function loadCaregivers(): Caregiver[] {
  return FIXED_CAREGIVERS;
}

export function loadActiveCaregiverId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function caregiverEmoji(role: string): string {
  if (role === "엄마") return "👩";
  if (role === "아빠") return "👨";
  if (role === "할머니") return "👵";
  if (role === "할아버지") return "👴";
  return "👤";
}

export function setActiveCaregiverId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {}
}
